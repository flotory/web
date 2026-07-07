<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\User;
use App\Models\Venue;
use App\Services\CampaignService;
use App\Services\VenueAnalyticsService;
use App\Support\DashboardPeriod;
use App\Support\VenuePresenter;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class VenueDashboardController extends Controller
{
    public function __construct(
        private VenueAnalyticsService $analytics,
        private CampaignService $campaigns,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $venueId = $request->integer('venue_id') ?: null;

        try {
            $period = DashboardPeriod::fromRequest($request);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if ($venueId) {
            $venue = Venue::query()->findOrFail($venueId);
            VenueAccess::requireAccess($user, $venue, ['owner']);

            return response()->json($this->dashboardForVenue($venue, $period));
        }

        $venueIds = $this->ownerVenueIds($user);

        if ($venueIds === []) {
            return response()->json([
                'scope' => 'none',
                'venue' => null,
                'venues_count' => 0,
                'period' => $period->toArray(),
                'stats' => [
                    'total_customers' => 0,
                    'active_customers' => 0,
                    'visits_last_28_days' => 0,
                    'rewards_unlocked_last_28_days' => 0,
                    'claim_rate_last_28_days' => 0,
                    'rewards_claimed' => 0,
                    'returning_customers' => 0,
                    'active_progressors' => 0,
                    'total_visits' => 0,
                    'milestones_claimed' => 0,
                    'milestones_unlocked' => 0,
                    'cycles_completed' => 0,
                ],
                'most_loyal_customers' => [],
                'monthly_activity' => [],
                'activity_series' => ['bucket' => 'day', 'rows' => []],
                'milestone_conversions' => [],
                'venue_summaries' => [],
                'insights' => [],
                'has_loyalty_activity' => false,
                'kpi_trends' => $this->emptyKpiTrends(),
                'customer_health' => [
                    'total' => 0,
                    'active' => 0,
                    'inactive' => 0,
                    'new' => 0,
                    'cooling' => 0,
                ],
                'active_campaigns' => [],
                'recent_activity' => [],
                'revenue_estimate' => [
                    'average_check_amount' => null,
                    'visits_last_28_days' => 0,
                    'total_visits' => 0,
                    'estimated_revenue_last_28_days' => null,
                    'estimated_revenue_total' => null,
                ],
            ]);
        }

        $venues = Venue::query()->whereIn('id', $venueIds)->get();

        $stats = $this->analytics->aggregateStats($venues, $period);
        $monthlyActivity = $this->analytics->aggregateMonthlyActivity($venues, $period);
        $activitySeries = $this->aggregateActivitySeries($venues, $period);
        $insights = $this->analytics->aggregateInsights($venues, $period);
        $milestoneConversions = [];
        $summaries = [];
        $activeCampaigns = [];

        foreach ($venues as $venue) {
            $payload = $this->dashboardForVenue($venue, $period);
            $activeCampaigns = array_merge($activeCampaigns, $payload['active_campaigns'] ?? []);

            foreach ($payload['milestone_conversions'] as $row) {
                $milestoneConversions[] = [
                    'venue_id' => $venue->id,
                    'venue_name' => $venue->name,
                    'reward_id' => $row['reward_id'],
                    'title' => $row['title'],
                    'required_stamps' => $row['required_stamps'],
                    'unlocked_count' => $row['unlocked_count'],
                    'claimed_count' => $row['claimed_count'],
                    'claim_rate' => $row['claim_rate'],
                ];
            }

            $summaries[] = [
                'venue_id' => $venue->id,
                'venue_name' => $venue->name,
                'stats' => $payload['stats'],
            ];
        }

        $brandIds = Venue::query()
            ->whereIn('id', $venueIds)
            ->pluck('brand_id')
            ->unique()
            ->values();

        $mostLoyal = DB::table('customers')
            ->join('users', 'customers.user_id', '=', 'users.id')
            ->join('venues', function ($join): void {
                $join->on('customers.brand_id', '=', 'venues.brand_id')
                    ->where('venues.is_primary', true);
            })
            ->whereIn('customers.brand_id', $brandIds)
            ->orderByDesc('customers.stamps')
            ->limit(5)
            ->get([
                'customers.id',
                'customers.brand_id',
                'customers.user_id',
                'customers.stamps',
                'users.name as user_name',
                'users.email as user_email',
                'venues.id as venue_id',
                'venues.name as venue_name',
            ])
            ->map(fn ($row) => [
                'id' => $row->id,
                'venue_id' => $row->venue_id,
                'user_id' => $row->user_id,
                'stamps' => $row->stamps,
                'venue' => ['id' => $row->venue_id, 'name' => $row->venue_name],
                'user' => ['id' => $row->user_id, 'name' => $row->user_name, 'email' => $row->user_email],
            ]);

        return response()->json([
            'scope' => 'all',
            'venue' => null,
            'venues_count' => count($venueIds),
            'period' => $period->toArray(),
            'stats' => $stats,
            'most_loyal_customers' => $mostLoyal,
            'monthly_activity' => $monthlyActivity,
            'activity_series' => $activitySeries,
            'milestone_conversions' => $milestoneConversions,
            'venue_summaries' => $summaries,
            'insights' => $insights,
            'has_loyalty_activity' => $this->analytics->hasAggregateActivity($venues),
            'kpi_trends' => $this->analytics->aggregateKpiTrends($venues, $period),
            'customer_health' => $this->analytics->aggregateCustomerHealth($venues),
            'recent_activity' => $this->analytics->aggregateRecentActivity($venues, 8, $period),
            'active_campaigns' => $activeCampaigns,
            'revenue_estimate' => $this->analytics->aggregateRevenueEstimate($venues, $period),
        ]);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        try {
            $period = DashboardPeriod::fromRequest($request);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json($this->dashboardForVenue($venue, $period));
    }

    /**
     * @return array<int, int>
     */
    private function ownerVenueIds(User $user): array
    {
        $brandIds = BrandUser::query()
            ->where('user_id', $user->id)
            ->where('role', 'owner')
            ->pluck('brand_id');

        return Venue::query()
            ->whereIn('brand_id', $brandIds)
            ->pluck('id')
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function dashboardForVenue(Venue $venue, DashboardPeriod $period): array
    {
        $activitySeries = $this->analytics->activitySeriesForVenue($venue, $period);

        return [
            'scope' => 'venue',
            'venue' => $venue->only(['id', 'name', 'slug']),
            'venues_count' => 1,
            'period' => $period->toArray(),
            'stats' => $this->analytics->statsForVenue($venue, $period),
            'most_loyal_customers' => $venue->customers()
                ->with('user:id,name,email')
                ->orderByDesc('stamps')
                ->limit(5)
                ->get(['id', 'brand_id', 'user_id', 'stamps'])
                ->map(fn ($customer) => array_merge($customer->toArray(), [
                    'venue_id' => $customer->venue_id,
                ])),
            'monthly_activity' => $activitySeries['rows'],
            'activity_series' => $activitySeries,
            'insights' => $this->analytics->insightsForVenue($venue, $period),
            'has_loyalty_activity' => $this->analytics->hasLoyaltyActivity($venue),
            'kpi_trends' => $this->analytics->kpiTrendsForVenue($venue, $period),
            'customer_health' => $this->analytics->customerHealthForVenue($venue),
            'recent_activity' => $this->analytics->recentActivityForVenue($venue, 8, $period),
            'milestone_conversions' => $this->analytics->milestoneConversionsForVenue($venue, $period),
            'venue_summaries' => [],
            'campaign_recommendations' => $this->campaigns->recommendationsFor($venue),
            'active_campaigns' => $this->campaigns->ownerActiveCampaignsFor($venue),
            'revenue_estimate' => $this->analytics->revenueEstimateForVenue($venue, $period),
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Venue>  $venues
     * @return array{bucket: string, rows: list<array{month: string, label: string, visits: int}>}
     */
    private function aggregateActivitySeries($venues, DashboardPeriod $period): array
    {
        $totals = [];
        $bucket = 'month';

        foreach ($venues as $venue) {
            $series = $this->analytics->activitySeriesForVenue($venue, $period);
            $bucket = $series['bucket'];

            foreach ($series['rows'] as $row) {
                $totals[$row['month']] = [
                    'month' => $row['month'],
                    'label' => $row['label'],
                    'visits' => ($totals[$row['month']]['visits'] ?? 0) + $row['visits'],
                ];
            }
        }

        return [
            'bucket' => $bucket,
            'rows' => array_values($totals),
        ];
    }

    /**
     * @return array<string, array{previous: int|float, change_pct: float|null}>
     */
    private function emptyKpiTrends(): array
    {
        $empty = ['previous' => 0, 'change_pct' => null];

        return [
            'visits_last_28_days' => $empty,
            'returning_guests' => $empty,
            'rewards_unlocked' => $empty,
            'repeat_rate' => $empty,
        ];
    }
}
