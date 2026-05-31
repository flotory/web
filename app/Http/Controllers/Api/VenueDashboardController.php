<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenueDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $venueId = $request->integer('venue_id') ?: null;

        if ($venueId) {
            $venue = Venue::query()->findOrFail($venueId);
            VenueAccess::requireAccess($user, $venue, ['owner']);

            return response()->json($this->dashboardForVenue($venue));
        }

        $venueIds = $this->ownerVenueIds($user);

        if ($venueIds === []) {
            return response()->json([
                'scope' => 'none',
                'venue' => null,
                'venues_count' => 0,
                'stats' => [
                    'total_customers' => 0,
                    'active_progressors' => 0,
                    'total_visits' => 0,
                    'milestones_claimed' => 0,
                    'milestones_unlocked' => 0,
                    'cycles_completed' => 0,
                ],
                'most_loyal_customers' => [],
                'monthly_activity' => [],
                'milestone_conversions' => [],
                'venue_summaries' => [],
            ]);
        }

        $venues = Venue::query()->whereIn('id', $venueIds)->get();

        $stats = [
            'total_customers' => 0,
            'active_progressors' => 0,
            'total_visits' => 0,
            'milestones_claimed' => 0,
            'milestones_unlocked' => 0,
            'cycles_completed' => 0,
        ];
        $monthly = [];
        $milestoneConversions = [];
        $summaries = [];

        foreach ($venues as $venue) {
            $payload = $this->dashboardForVenue($venue);
            $stats['total_customers'] += $payload['stats']['total_customers'];
            $stats['active_progressors'] += $payload['stats']['active_progressors'];
            $stats['total_visits'] += $payload['stats']['total_visits'];
            $stats['milestones_claimed'] += $payload['stats']['milestones_claimed'];
            $stats['milestones_unlocked'] += $payload['stats']['milestones_unlocked'];
            $stats['cycles_completed'] += $payload['stats']['cycles_completed'];

            foreach ($payload['monthly_activity'] as $row) {
                $monthly[$row['month']] = ($monthly[$row['month']] ?? 0) + $row['visits'];
            }

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

        ksort($monthly);
        $monthlyActivity = collect($monthly)
            ->map(fn (int $visits, string $month) => ['month' => $month, 'visits' => $visits])
            ->values()
            ->take(-12);

        $mostLoyal = DB::table('customers')
            ->join('users', 'customers.user_id', '=', 'users.id')
            ->join('venues', 'customers.venue_id', '=', 'venues.id')
            ->whereIn('customers.venue_id', $venueIds)
            ->orderByDesc('customers.stamps')
            ->limit(5)
            ->get([
                'customers.id',
                'customers.venue_id',
                'customers.user_id',
                'customers.stamps',
                'users.name as user_name',
                'users.email as user_email',
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
            'stats' => $stats,
            'most_loyal_customers' => $mostLoyal,
            'monthly_activity' => $monthlyActivity,
            'milestone_conversions' => $milestoneConversions,
            'venue_summaries' => $summaries,
        ]);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        return response()->json($this->dashboardForVenue($venue));
    }

    private function monthBucketExpression(): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : 'DATE_FORMAT(created_at, "%Y-%m")';
    }

    /**
     * @return array<int, int>
     */
    private function ownerVenueIds(User $user): array
    {
        if (VenueAccess::isAdmin($user)) {
            return Venue::query()->pluck('id')->all();
        }

        return VenueUser::query()
            ->where('user_id', $user->id)
            ->where('role', 'owner')
            ->pluck('venue_id')
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function dashboardForVenue(Venue $venue): array
    {
        $activeProgressors = $venue->customers()
            ->withCount('visits')
            ->having('visits_count', '>=', 2)
            ->count();

        return [
            'scope' => 'venue',
            'venue' => $venue->only(['id', 'name', 'slug']),
            'venues_count' => 1,
            'stats' => [
                'total_customers' => $venue->customers()->count(),
                'active_progressors' => $activeProgressors,
                'total_visits' => $venue->visits()->count(),
                'milestones_claimed' => DB::table('reward_unlocks')
                    ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
                    ->where('rewards.venue_id', $venue->id)
                    ->whereNotNull('reward_unlocks.claimed_at')
                    ->count(),
                'milestones_unlocked' => DB::table('reward_unlocks')
                    ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
                    ->where('rewards.venue_id', $venue->id)
                    ->count(),
                'cycles_completed' => DB::table('customer_reward_cycles')
                    ->join('customers', 'customer_reward_cycles.customer_id', '=', 'customers.id')
                    ->where('customers.venue_id', $venue->id)
                    ->whereNotNull('customer_reward_cycles.completed_at')
                    ->count(),
            ],
            'most_loyal_customers' => $venue->customers()
                ->with('user:id,name,email')
                ->orderByDesc('stamps')
                ->limit(5)
                ->get(['id', 'venue_id', 'user_id', 'stamps']),
            'monthly_activity' => $venue->visits()
                ->selectRaw($this->monthBucketExpression().' as month, COUNT(*) as visits')
                ->groupBy('month')
                ->orderBy('month')
                ->limit(12)
                ->get(),
            'milestone_conversions' => DB::table('reward_unlocks')
                ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
                ->where('rewards.venue_id', $venue->id)
                ->selectRaw('rewards.id as reward_id')
                ->selectRaw('rewards.title')
                ->selectRaw('rewards.required_stamps')
                ->selectRaw('COUNT(*) as unlocked_count')
                ->selectRaw('SUM(CASE WHEN reward_unlocks.claimed_at IS NOT NULL THEN 1 ELSE 0 END) as claimed_count')
                ->groupBy('rewards.id', 'rewards.title', 'rewards.required_stamps')
                ->orderBy('rewards.required_stamps')
                ->get()
                ->map(fn ($row) => [
                    'reward_id' => $row->reward_id,
                    'title' => $row->title,
                    'required_stamps' => (int) $row->required_stamps,
                    'unlocked_count' => (int) $row->unlocked_count,
                    'claimed_count' => (int) $row->claimed_count,
                    'claim_rate' => (int) $row->unlocked_count > 0
                        ? round(((int) $row->claimed_count / (int) $row->unlocked_count) * 100, 1)
                        : 0.0,
                ]),
            'venue_summaries' => [],
        ];
    }
}

