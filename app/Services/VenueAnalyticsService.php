<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\Venue;
use App\Models\Visit;
use App\Support\DashboardPeriod;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class VenueAnalyticsService
{
    public const ROLLING_WINDOW_DAYS = 28;

    public function __construct(private CustomerRetentionService $retention) {}

    /**
     * @return array<string, mixed>
     */
    public function statsForVenue(Venue $venue, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);

        $totalCustomers = $venue->customers()->count();
        $totalVisits = $venue->visits()->count();
        $periodVisits = $this->visitsBetween($venue, $period->start, $period->end);
        $rewardsUnlockedInPeriod = $this->rewardUnlocksBetween($venue, $period->start, $period->end);
        $claimRateInPeriod = $this->claimRateBetween($venue, $period->start, $period->end);

        $activeCustomers = $venue->customers()
            ->whereHas('visits', fn ($query) => $query->where(
                'created_at',
                '>=',
                now()->subDays(CustomerRetentionService::ACTIVE_WITHIN_DAYS),
            ))
            ->count();

        $returningCustomers = $this->returningGuestsBetween($venue, $period->start, $period->end);

        $rewardsClaimedInPeriod = $this->rewardsClaimedBetween($venue, $period->start, $period->end);

        return [
            'total_customers' => $totalCustomers,
            'active_customers' => $activeCustomers,
            'visits_last_28_days' => $periodVisits,
            'rewards_unlocked_last_28_days' => $rewardsUnlockedInPeriod,
            'claim_rate_last_28_days' => $claimRateInPeriod,
            'rewards_claimed' => $rewardsClaimedInPeriod,
            'returning_customers' => $returningCustomers,
            'total_visits' => $totalVisits,
            'active_progressors' => $returningCustomers,
            'milestones_claimed' => $rewardsClaimedInPeriod,
            'milestones_unlocked' => $this->rewardUnlocksBetween($venue, $period->start, $period->end),
            'cycles_completed' => DB::table('customer_reward_cycles')
                ->join('customers', 'customer_reward_cycles.customer_id', '=', 'customers.id')
                ->where('customers.venue_id', $venue->id)
                ->whereBetween('customer_reward_cycles.completed_at', [$period->start, $period->end])
                ->count(),
        ];
    }

    /**
     * @return list<array{month: string, label: string, visits: int}>
     */
    public const MONTHLY_ACTIVITY_MONTHS = 12;

    public function monthlyActivityForVenue(Venue $venue, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);

        return $this->activitySeriesForVenue($venue, $period)['rows'];
    }

    /**
     * @return array{bucket: string, rows: list<array{month: string, label: string, visits: int}>}
     */
    public function activitySeriesForVenue(Venue $venue, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $bucket = $this->activityBucketForPeriod($period);

        $raw = $venue->visits()
            ->whereBetween('created_at', [$period->start, $period->end])
            ->get(['created_at'])
            ->groupBy(fn (Visit $visit) => $this->activityBucketKey($visit->created_at, $bucket))
            ->map(fn (Collection $visits) => $visits->count());

        $rows = [];

        foreach ($this->activityBucketKeys($period, $bucket) as [$key, $label]) {
            $rows[] = [
                'month' => $key,
                'label' => $label,
                'visits' => (int) ($raw[$key] ?? 0),
            ];
        }

        return [
            'bucket' => $bucket,
            'rows' => $rows,
        ];
    }

    /**
     * @return array{
     *     average_check_amount: float|null,
     *     visits_last_28_days: int,
     *     total_visits: int,
     *     estimated_revenue_last_28_days: float|null,
     *     estimated_revenue_total: float|null
     * }
     */
    public function revenueEstimateForVenue(Venue $venue, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $stats = $this->statsForVenue($venue, $period);
        $averageCheck = $venue->average_check_amount !== null
            ? (float) $venue->average_check_amount
            : null;

        return [
            'average_check_amount' => $averageCheck,
            'visits_last_28_days' => (int) $stats['visits_last_28_days'],
            'total_visits' => (int) $stats['total_visits'],
            'estimated_revenue_last_28_days' => $averageCheck !== null
                ? round($stats['visits_last_28_days'] * $averageCheck, 2)
                : null,
            'estimated_revenue_total' => $averageCheck !== null
                ? round($stats['total_visits'] * $averageCheck, 2)
                : null,
        ];
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return array{
     *     average_check_amount: null,
     *     visits_last_28_days: int,
     *     total_visits: int,
     *     estimated_revenue_last_28_days: float|null,
     *     estimated_revenue_total: float|null
     * }
     */
    public function aggregateRevenueEstimate(Collection $venues, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $visitsLast28Days = 0;
        $totalVisits = 0;
        $estimatedRevenueLast28Days = 0.0;
        $estimatedRevenueTotal = 0.0;
        $hasConfiguredVenue = false;

        foreach ($venues as $venue) {
            $estimate = $this->revenueEstimateForVenue($venue, $period);
            $visitsLast28Days += $estimate['visits_last_28_days'];
            $totalVisits += $estimate['total_visits'];

            if ($estimate['average_check_amount'] !== null) {
                $hasConfiguredVenue = true;
                $estimatedRevenueLast28Days += $estimate['estimated_revenue_last_28_days'] ?? 0;
                $estimatedRevenueTotal += $estimate['estimated_revenue_total'] ?? 0;
            }
        }

        return [
            'average_check_amount' => null,
            'visits_last_28_days' => $visitsLast28Days,
            'total_visits' => $totalVisits,
            'estimated_revenue_last_28_days' => $hasConfiguredVenue
                ? round($estimatedRevenueLast28Days, 2)
                : null,
            'estimated_revenue_total' => $hasConfiguredVenue
                ? round($estimatedRevenueTotal, 2)
                : null,
        ];
    }

    /**
     * @return list<array{text: string, tone: string}>
     */
    public function insightsForVenue(Venue $venue, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $insights = [];
        $stats = $this->statsForVenue($venue, $period);
        $totalCustomers = $stats['total_customers'];

        if ($totalCustomers === 0) {
            return [];
        }

        $closeToReward = $this->customersCloseToNextReward($venue);
        if ($closeToReward > 0) {
            $stampWord = $closeToReward === 1 ? 'customer needs' : 'customers need';
            $insights[] = [
                'text' => "{$closeToReward} {$stampWord} only 1 more stamp for their next reward",
                'tone' => 'positive',
            ];
        }

        $summary = $this->retention->activitySummary($venue);
        if ($summary['inactive'] > 0) {
            $insights[] = [
                'text' => "{$summary['inactive']} customers have not visited in 30+ days",
                'tone' => 'warning',
            ];
        }

        $topReward = DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereNotNull('reward_unlocks.claimed_at')
            ->selectRaw('rewards.title, COUNT(*) as claimed_count')
            ->groupBy('rewards.id', 'rewards.title')
            ->orderByDesc('claimed_count')
            ->first();

        if ($topReward) {
            $insights[] = [
                'text' => 'Most redeemed reward: '.$topReward->title,
                'tone' => 'neutral',
            ];
        }

        if ($stats['total_visits'] > 0) {
            $avg = round($stats['total_visits'] / max(1, $totalCustomers), 1);
            $insights[] = [
                'text' => "Average visits per customer: {$avg}",
                'tone' => 'neutral',
            ];
        }

        if ($stats['returning_customers'] > 0) {
            $insights[] = [
                'text' => "{$stats['returning_customers']} returning guests with 2+ visits in {$period->label()}",
                'tone' => 'positive',
            ];
        }

        return array_slice($insights, 0, 5);
    }

    public function hasLoyaltyActivity(Venue $venue): bool
    {
        if ($venue->visits()->exists()) {
            return true;
        }

        return $venue->customers()->whereHas('visits')->exists();
    }

    /**
     * @return array{total: int, active: int, inactive: int, new: int, cooling: int}
     */
    public function customerHealthForVenue(Venue $venue): array
    {
        return $this->retention->activitySummary($venue);
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return array{total: int, active: int, inactive: int, new: int, cooling: int}
     */
    public function aggregateCustomerHealth(Collection $venues): array
    {
        $summary = [
            'total' => 0,
            'active' => 0,
            'inactive' => 0,
            'new' => 0,
            'cooling' => 0,
        ];

        foreach ($venues as $venue) {
            foreach ($this->customerHealthForVenue($venue) as $key => $value) {
                $summary[$key] = ($summary[$key] ?? 0) + (int) $value;
            }
        }

        return $summary;
    }

    private function customersCloseToNextReward(Venue $venue): int
    {
        $milestones = Reward::query()
            ->where('venue_id', $venue->id)
            ->where('active', true)
            ->where('reward_type', 'milestone')
            ->orderBy('required_stamps')
            ->get(['required_stamps']);

        if ($milestones->isEmpty()) {
            return 0;
        }

        return $venue->customers()
            ->get(['id', 'stamps'])
            ->filter(function (Customer $customer) use ($milestones): bool {
                $next = $milestones->first(fn (Reward $reward) => $reward->required_stamps > $customer->stamps);

                return $next && ($next->required_stamps - $customer->stamps) === 1;
            })
            ->count();
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return array<string, mixed>
     */
    public function aggregateStats(Collection $venues, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $stats = [
            'total_customers' => 0,
            'active_customers' => 0,
            'visits_last_28_days' => 0,
            'rewards_claimed' => 0,
            'returning_customers' => 0,
            'total_visits' => 0,
            'active_progressors' => 0,
            'milestones_claimed' => 0,
            'milestones_unlocked' => 0,
            'cycles_completed' => 0,
            'rewards_unlocked_last_28_days' => 0,
            'claim_rate_last_28_days' => 0.0,
        ];

        $claimedTotal = 0;
        $unlockedTotal = 0;

        foreach ($venues as $venue) {
            $venueStats = $this->statsForVenue($venue, $period);
            foreach ($stats as $key => $value) {
                if ($key === 'claim_rate_last_28_days') {
                    continue;
                }

                $stats[$key] += $venueStats[$key] ?? 0;
            }

            [$claimed, $unlocked] = $this->claimCountsBetween($venue, $period->start, $period->end);
            $claimedTotal += $claimed;
            $unlockedTotal += $unlocked;
        }

        $stats['claim_rate_last_28_days'] = $unlockedTotal > 0
            ? round(($claimedTotal / $unlockedTotal) * 100, 1)
            : 0.0;

        return $stats;
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return list<array{month: string, label: string, visits: int}>
     */
    public function aggregateMonthlyActivity(Collection $venues, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $totals = [];

        foreach ($venues as $venue) {
            foreach ($this->monthlyActivityForVenue($venue, $period) as $row) {
                $totals[$row['month']] = [
                    'month' => $row['month'],
                    'label' => $row['label'],
                    'visits' => ($totals[$row['month']]['visits'] ?? 0) + $row['visits'],
                ];
            }
        }

        return array_values($totals);
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return list<array{text: string, tone: string}>
     */
    public function aggregateInsights(Collection $venues, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $insights = [];
        $stats = $this->aggregateStats($venues, $period);

        if ($stats['total_customers'] === 0) {
            return [];
        }

        $closeToReward = $venues->sum(fn (Venue $venue) => $this->customersCloseToNextReward($venue));
        if ($closeToReward > 0) {
            $insights[] = [
                'text' => "{$closeToReward} customers need only 1 more stamp for their next reward",
                'tone' => 'positive',
            ];
        }

        $inactive = $venues->sum(fn (Venue $venue) => $this->retention->activitySummary($venue)['inactive']);
        if ($inactive > 0) {
            $insights[] = [
                'text' => "{$inactive} customers have not visited in 30+ days across your venues",
                'tone' => 'warning',
            ];
        }

        if ($stats['total_visits'] > 0) {
            $avg = round($stats['total_visits'] / max(1, $stats['total_customers']), 1);
            $insights[] = [
                'text' => "Average visits per customer: {$avg}",
                'tone' => 'neutral',
            ];
        }

        if ($stats['returning_customers'] > 0) {
            $insights[] = [
                'text' => "{$stats['returning_customers']} returning guests with 2+ visits in {$period->label()}",
                'tone' => 'positive',
            ];
        }

        return array_slice($insights, 0, 5);
    }

    /**
     * @return list<array{type: string, title: string, occurred_at: string}>
     */
    public function recentActivityForVenue(Venue $venue, int $limit = 8, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $events = collect();

        Visit::query()
            ->where('venue_id', $venue->id)
            ->whereBetween('created_at', [$period->start, $period->end])
            ->with(['customer.user:id,name'])
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->each(function (Visit $visit) use ($events): void {
                $name = $visit->customer?->user?->name ?? 'Guest';
                $events->push([
                    'type' => 'stamp',
                    'occurred_at' => $visit->created_at?->toIso8601String(),
                    'title' => "Stamp added for {$name}",
                ]);
            });

        RewardUnlock::query()
            ->whereHas('customer', fn ($query) => $query->where('venue_id', $venue->id))
            ->whereBetween('unlocked_at', [$period->start, $period->end])
            ->with(['customer.user:id,name', 'reward:id,title'])
            ->orderByDesc('unlocked_at')
            ->limit(20)
            ->get()
            ->each(function (RewardUnlock $unlock) use ($events): void {
                $name = $unlock->customer?->user?->name ?? 'Guest';
                $rewardTitle = $unlock->reward?->title ?? 'Reward';

                $events->push([
                    'type' => 'reward_unlocked',
                    'occurred_at' => $unlock->unlocked_at?->toIso8601String(),
                    'title' => "Reward unlocked: {$rewardTitle} — {$name}",
                ]);

                if ($unlock->claimed_at) {
                    $events->push([
                        'type' => 'reward_redeemed',
                        'occurred_at' => $unlock->claimed_at->toIso8601String(),
                        'title' => "Reward redeemed: {$rewardTitle} — {$name}",
                    ]);
                }
            });

        Customer::query()
            ->where('venue_id', $venue->id)
            ->whereBetween('created_at', [$period->start, $period->end])
            ->with('user:id,name')
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->each(function (Customer $customer) use ($events): void {
                $name = $customer->user?->name ?? 'Guest';
                $events->push([
                    'type' => 'customer_joined',
                    'occurred_at' => $customer->created_at?->toIso8601String(),
                    'title' => "{$name} joined loyalty",
                ]);
            });

        Reward::query()
            ->where('venue_id', $venue->id)
            ->whereBetween('created_at', [$period->start, $period->end])
            ->latest('created_at')
            ->limit(10)
            ->get(['id', 'title', 'created_at'])
            ->each(function (Reward $reward) use ($events): void {
                $events->push([
                    'type' => 'reward_created',
                    'occurred_at' => $reward->created_at?->toIso8601String(),
                    'title' => "Reward published: {$reward->title}",
                ]);
            });

        Campaign::query()
            ->where('venue_id', $venue->id)
            ->whereNotNull('activated_at')
            ->whereBetween('activated_at', [$period->start, $period->end])
            ->latest('activated_at')
            ->limit(10)
            ->get(['id', 'name', 'activated_at'])
            ->each(function (Campaign $campaign) use ($events): void {
                $events->push([
                    'type' => 'campaign_activated',
                    'occurred_at' => $campaign->activated_at?->toIso8601String(),
                    'title' => "Campaign activated: {$campaign->name}",
                ]);
            });

        return $events
            ->filter(fn (array $event): bool => ! empty($event['occurred_at']))
            ->sortByDesc('occurred_at')
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return list<array{type: string, title: string, occurred_at: string, venue_name?: string}>
     */
    public function aggregateRecentActivity(Collection $venues, int $limit = 8, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $events = collect();

        foreach ($venues as $venue) {
            foreach ($this->recentActivityForVenue($venue, $limit * 2, $period) as $event) {
                $events->push([
                    ...$event,
                    'venue_name' => $venue->name,
                ]);
            }
        }

        return $events
            ->filter(fn (array $event): bool => ! empty($event['occurred_at']))
            ->sortByDesc('occurred_at')
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Venue>  $venues
     */
    public function hasAggregateActivity(Collection $venues): bool
    {
        foreach ($venues as $venue) {
            if ($this->hasLoyaltyActivity($venue)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, array{previous: float|int, change_pct: float|null}>
     */
    public function kpiTrendsForVenue(Venue $venue, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $previous = $period->previous();

        return [
            'visits_last_28_days' => $this->trendEntry(
                $this->visitsBetween($venue, $previous->start, $previous->end),
                $this->visitsBetween($venue, $period->start, $period->end),
            ),
            'returning_guests' => $this->trendEntry(
                $this->returningGuestsBetween($venue, $previous->start, $previous->end),
                $this->returningGuestsBetween($venue, $period->start, $period->end),
            ),
            'rewards_unlocked' => $this->trendEntry(
                $this->rewardUnlocksBetween($venue, $previous->start, $previous->end),
                $this->rewardUnlocksBetween($venue, $period->start, $period->end),
            ),
            'repeat_rate' => $this->trendEntry(
                $this->claimRateBetween($venue, $previous->start, $previous->end),
                $this->claimRateBetween($venue, $period->start, $period->end),
            ),
        ];
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return array<string, array{previous: float|int, change_pct: float|null}>
     */
    public function aggregateKpiTrends(Collection $venues, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);
        $previous = $period->previous();

        $visitsPrevious = 0;
        $visitsCurrent = 0;
        $returningPrevious = 0;
        $returningCurrent = 0;
        $unlocksPrevious = 0;
        $unlocksCurrent = 0;
        $claimedPrevious = 0;
        $claimedCurrent = 0;
        $unlockedPrevious = 0;
        $unlockedCurrent = 0;

        foreach ($venues as $venue) {
            $visitsPrevious += $this->visitsBetween($venue, $previous->start, $previous->end);
            $visitsCurrent += $this->visitsBetween($venue, $period->start, $period->end);
            $returningPrevious += $this->returningGuestsBetween($venue, $previous->start, $previous->end);
            $returningCurrent += $this->returningGuestsBetween($venue, $period->start, $period->end);
            $unlocksPrevious += $this->rewardUnlocksBetween($venue, $previous->start, $previous->end);
            $unlocksCurrent += $this->rewardUnlocksBetween($venue, $period->start, $period->end);

            [$claimedPrev, $unlockedPrev] = $this->claimCountsBetween($venue, $previous->start, $previous->end);
            [$claimedCurr, $unlockedCurr] = $this->claimCountsBetween($venue, $period->start, $period->end);
            $claimedPrevious += $claimedPrev;
            $claimedCurrent += $claimedCurr;
            $unlockedPrevious += $unlockedPrev;
            $unlockedCurrent += $unlockedCurr;
        }

        $repeatPrevious = $unlockedPrevious > 0
            ? round(($claimedPrevious / $unlockedPrevious) * 100, 1)
            : 0.0;
        $repeatCurrent = $unlockedCurrent > 0
            ? round(($claimedCurrent / $unlockedCurrent) * 100, 1)
            : 0.0;

        return [
            'visits_last_28_days' => $this->trendEntry($visitsPrevious, $visitsCurrent),
            'returning_guests' => $this->trendEntry($returningPrevious, $returningCurrent),
            'rewards_unlocked' => $this->trendEntry($unlocksPrevious, $unlocksCurrent),
            'repeat_rate' => $this->trendEntry($repeatPrevious, $repeatCurrent),
        ];
    }

    /**
     * @return array{previous: float|int, change_pct: float|null}
     */
    private function trendEntry(float|int $previous, float|int $current): array
    {
        return [
            'previous' => $previous,
            'change_pct' => $this->percentChange($previous, $current),
        ];
    }

    private function percentChange(float|int $previous, float|int $current): ?float
    {
        if ($previous == 0 && $current == 0) {
            return null;
        }

        if ($previous == 0) {
            return $current == 0 ? null : 100.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function rewardUnlocksBetween(Venue $venue, Carbon $start, Carbon $end): int
    {
        return (int) DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereBetween('reward_unlocks.unlocked_at', [$start, $end])
            ->count();
    }

    /**
     * @return list<array{reward_id: int, title: string, required_stamps: int, unlocked_count: int, claimed_count: int, claim_rate: float}>
     */
    public function milestoneConversionsForVenue(Venue $venue, ?DashboardPeriod $period = null): array
    {
        $period ??= DashboardPeriod::fromPreset(DashboardPeriod::DEFAULT_PRESET);

        return DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereBetween('reward_unlocks.unlocked_at', [$period->start, $period->end])
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
            ])
            ->all();
    }

    private function visitsBetween(Venue $venue, Carbon $start, Carbon $end): int
    {
        return $venue->visits()
            ->whereBetween('created_at', [$start, $end])
            ->count();
    }

    private function returningGuestsBetween(Venue $venue, Carbon $start, Carbon $end): int
    {
        return (int) DB::table('visits')
            ->where('venue_id', $venue->id)
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('customer_id')
            ->havingRaw('COUNT(*) >= 2')
            ->select('customer_id')
            ->get()
            ->count();
    }

    private function claimRateBetween(Venue $venue, Carbon $start, Carbon $end): float
    {
        [$claimed, $unlocked] = $this->claimCountsBetween($venue, $start, $end);

        if ($unlocked === 0) {
            return 0.0;
        }

        return round(($claimed / $unlocked) * 100, 1);
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function claimCountsBetween(Venue $venue, Carbon $start, Carbon $end): array
    {
        $row = DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereBetween('reward_unlocks.unlocked_at', [$start, $end])
            ->selectRaw('COUNT(*) as unlocked_count')
            ->selectRaw('SUM(CASE WHEN reward_unlocks.claimed_at IS NOT NULL THEN 1 ELSE 0 END) as claimed_count')
            ->first();

        return [
            (int) ($row->claimed_count ?? 0),
            (int) ($row->unlocked_count ?? 0),
        ];
    }

    private function rewardsClaimedBetween(Venue $venue, Carbon $start, Carbon $end): int
    {
        return (int) DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereNotNull('reward_unlocks.claimed_at')
            ->whereBetween('reward_unlocks.claimed_at', [$start, $end])
            ->count();
    }

    private function activityBucketForPeriod(DashboardPeriod $period): string
    {
        if ($period->days() <= 35) {
            return 'day';
        }

        if ($period->days() <= 120) {
            return 'week';
        }

        return 'month';
    }

    /**
     * @return list<array{0: string, 1: string}>
     */
    private function activityBucketKeys(DashboardPeriod $period, string $bucket): array
    {
        $keys = [];
        $cursor = $period->start->copy()->startOfDay();
        $end = $period->end->copy()->endOfDay();

        if ($bucket === 'day') {
            while ($cursor->lessThanOrEqualTo($end)) {
                $keys[] = [$cursor->format('Y-m-d'), $cursor->format('M j')];
                $cursor->addDay();
            }

            return $keys;
        }

        if ($bucket === 'week') {
            $cursor = $period->start->copy()->startOfWeek(Carbon::MONDAY);
            if ($cursor->greaterThan($period->start)) {
                $cursor->subWeek();
            }

            while ($cursor->lessThanOrEqualTo($end)) {
                $weekEnd = $cursor->copy()->endOfWeek(Carbon::SUNDAY);
                if ($weekEnd->greaterThan($end)) {
                    $weekEnd = $end->copy();
                }

                $keys[] = [
                    $cursor->format('Y-m-d'),
                    $cursor->format('M j').' – '.$weekEnd->format('M j'),
                ];
                $cursor->addWeek();
            }

            return $keys;
        }

        $cursor = $period->start->copy()->startOfMonth();
        $endMonth = $period->end->copy()->startOfMonth();

        while ($cursor->lessThanOrEqualTo($endMonth)) {
            $keys[] = [$cursor->format('Y-m'), $cursor->format('M Y')];
            $cursor->addMonth();
        }

        return $keys;
    }

    private function activityBucketKey(Carbon $timestamp, string $bucket): string
    {
        return match ($bucket) {
            'day' => $timestamp->format('Y-m-d'),
            'week' => $timestamp->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d'),
            default => $timestamp->format('Y-m'),
        };
    }
}
