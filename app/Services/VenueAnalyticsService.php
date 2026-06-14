<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\Venue;
use App\Models\Visit;
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
    public function statsForVenue(Venue $venue): array
    {
        [$windowStart, $windowEnd] = $this->currentRollingWindow();

        $totalCustomers = $venue->customers()->count();
        $totalVisits = $venue->visits()->count();
        $visitsLast28Days = $this->visitsBetween($venue, $windowStart, $windowEnd);

        $activeCustomers = $venue->customers()
            ->whereHas('visits', fn ($query) => $query->where(
                'created_at',
                '>=',
                now()->subDays(CustomerRetentionService::ACTIVE_WITHIN_DAYS),
            ))
            ->count();

        $returningCustomers = $this->returningGuestsBetween($venue, $windowStart, $windowEnd);

        $rewardsClaimed = DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereNotNull('reward_unlocks.claimed_at')
            ->count();

        return [
            'total_customers' => $totalCustomers,
            'active_customers' => $activeCustomers,
            'visits_last_28_days' => $visitsLast28Days,
            'rewards_claimed' => $rewardsClaimed,
            'returning_customers' => $returningCustomers,
            'total_visits' => $totalVisits,
            'active_progressors' => $returningCustomers,
            'milestones_claimed' => $rewardsClaimed,
            'milestones_unlocked' => DB::table('reward_unlocks')
                ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
                ->where('rewards.venue_id', $venue->id)
                ->count(),
            'cycles_completed' => DB::table('customer_reward_cycles')
                ->join('customers', 'customer_reward_cycles.customer_id', '=', 'customers.id')
                ->where('customers.venue_id', $venue->id)
                ->whereNotNull('customer_reward_cycles.completed_at')
                ->count(),
        ];
    }

    /**
     * @return list<array{month: string, label: string, visits: int}>
     */
    public function monthlyActivityForVenue(Venue $venue, int $months = 6): array
    {
        $monthExpression = DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : 'DATE_FORMAT(created_at, "%Y-%m")';

        $raw = $venue->visits()
            ->selectRaw("{$monthExpression} as month, COUNT(*) as visits")
            ->groupBy('month')
            ->pluck('visits', 'month');

        $rows = [];

        for ($offset = $months - 1; $offset >= 0; $offset--) {
            $date = now()->startOfMonth()->subMonths($offset);
            $key = $date->format('Y-m');
            $rows[] = [
                'month' => $key,
                'label' => $date->format('M Y'),
                'visits' => (int) ($raw[$key] ?? 0),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array{text: string, tone: string}>
     */
    public function insightsForVenue(Venue $venue): array
    {
        $insights = [];
        $stats = $this->statsForVenue($venue);
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

        if ($stats['returning_customers'] > 0 && $totalCustomers > 0) {
            $insights[] = [
                'text' => "{$stats['returning_customers']} of {$totalCustomers} customers visited at least twice in the last ".self::ROLLING_WINDOW_DAYS.' days',
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
    public function aggregateStats(Collection $venues): array
    {
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
        ];

        foreach ($venues as $venue) {
            $venueStats = $this->statsForVenue($venue);
            foreach ($stats as $key => $value) {
                $stats[$key] += $venueStats[$key] ?? 0;
            }
        }

        return $stats;
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return list<array{month: string, label: string, visits: int}>
     */
    public function aggregateMonthlyActivity(Collection $venues, int $months = 6): array
    {
        $totals = [];

        foreach ($venues as $venue) {
            foreach ($this->monthlyActivityForVenue($venue, $months) as $row) {
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
    public function aggregateInsights(Collection $venues): array
    {
        $insights = [];
        $stats = $this->aggregateStats($venues);

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
                'text' => "{$stats['returning_customers']} returning guests with 2+ visits in the last ".self::ROLLING_WINDOW_DAYS.' days',
                'tone' => 'positive',
            ];
        }

        return array_slice($insights, 0, 5);
    }

    /**
     * @return list<array{type: string, title: string, occurred_at: string}>
     */
    public function recentActivityForVenue(Venue $venue, int $limit = 8): array
    {
        $events = collect();

        Visit::query()
            ->where('venue_id', $venue->id)
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
    public function aggregateRecentActivity(Collection $venues, int $limit = 8): array
    {
        $events = collect();

        foreach ($venues as $venue) {
            foreach ($this->recentActivityForVenue($venue, $limit * 2) as $event) {
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
    public function kpiTrendsForVenue(Venue $venue): array
    {
        [$currentStart, $currentEnd] = $this->currentRollingWindow();
        [$previousStart, $previousEnd] = $this->previousRollingWindow();

        return [
            'visits_last_28_days' => $this->trendEntry(
                $this->visitsBetween($venue, $previousStart, $previousEnd),
                $this->visitsBetween($venue, $currentStart, $currentEnd),
            ),
            'returning_guests' => $this->trendEntry(
                $this->returningGuestsBetween($venue, $previousStart, $previousEnd),
                $this->returningGuestsBetween($venue, $currentStart, $currentEnd),
            ),
            'rewards_unlocked' => $this->trendEntry(
                $this->rewardUnlocksCreatedBetween($venue, $previousStart, $previousEnd),
                $this->rewardUnlocksCreatedBetween($venue, $currentStart, $currentEnd),
            ),
            'repeat_rate' => $this->trendEntry(
                $this->claimRateBetween($venue, $previousStart, $previousEnd),
                $this->claimRateBetween($venue, $currentStart, $currentEnd),
            ),
        ];
    }

    /**
     * @param  Collection<int, Venue>  $venues
     * @return array<string, array{previous: float|int, change_pct: float|null}>
     */
    public function aggregateKpiTrends(Collection $venues): array
    {
        [$currentStart, $currentEnd] = $this->currentRollingWindow();
        [$previousStart, $previousEnd] = $this->previousRollingWindow();

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
            $visitsPrevious += $this->visitsBetween($venue, $previousStart, $previousEnd);
            $visitsCurrent += $this->visitsBetween($venue, $currentStart, $currentEnd);
            $returningPrevious += $this->returningGuestsBetween($venue, $previousStart, $previousEnd);
            $returningCurrent += $this->returningGuestsBetween($venue, $currentStart, $currentEnd);
            $unlocksPrevious += $this->rewardUnlocksCreatedBetween($venue, $previousStart, $previousEnd);
            $unlocksCurrent += $this->rewardUnlocksCreatedBetween($venue, $currentStart, $currentEnd);

            [$claimedPrev, $unlockedPrev] = $this->claimCountsBetween($venue, $previousStart, $previousEnd);
            [$claimedCurr, $unlockedCurr] = $this->claimCountsBetween($venue, $currentStart, $currentEnd);
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
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function rewardUnlocksCreatedBetween(Venue $venue, Carbon $start, Carbon $end): int
    {
        return (int) DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereBetween('reward_unlocks.created_at', [$start, $end])
            ->count();
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function currentRollingWindow(): array
    {
        return [
            now()->subDays(self::ROLLING_WINDOW_DAYS)->startOfDay(),
            now(),
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function previousRollingWindow(): array
    {
        return [
            now()->subDays(self::ROLLING_WINDOW_DAYS * 2)->startOfDay(),
            now()->subDays(self::ROLLING_WINDOW_DAYS)->endOfDay(),
        ];
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
            ->whereBetween('reward_unlocks.created_at', [$start, $end])
            ->selectRaw('COUNT(*) as unlocked_count')
            ->selectRaw('SUM(CASE WHEN reward_unlocks.claimed_at IS NOT NULL THEN 1 ELSE 0 END) as claimed_count')
            ->first();

        return [
            (int) ($row->claimed_count ?? 0),
            (int) ($row->unlocked_count ?? 0),
        ];
    }
}
