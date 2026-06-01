<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Reward;
use App\Models\Venue;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class VenueAnalyticsService
{
    public function __construct(private CustomerRetentionService $retention) {}

    /**
     * @return array<string, mixed>
     */
    public function statsForVenue(Venue $venue): array
    {
        $totalCustomers = $venue->customers()->count();
        $totalVisits = $venue->visits()->count();
        $visitsThisMonth = $venue->visits()
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        $activeCustomers = $venue->customers()
            ->whereHas('visits', fn ($query) => $query->where(
                'created_at',
                '>=',
                now()->subDays(CustomerRetentionService::ACTIVE_WITHIN_DAYS),
            ))
            ->count();

        $returningCustomers = $venue->customers()
            ->has('visits', '>=', 2)
            ->count();

        $rewardsClaimed = DB::table('reward_unlocks')
            ->join('rewards', 'reward_unlocks.reward_id', '=', 'rewards.id')
            ->where('rewards.venue_id', $venue->id)
            ->whereNotNull('reward_unlocks.claimed_at')
            ->count();

        return [
            'total_customers' => $totalCustomers,
            'active_customers' => $activeCustomers,
            'visits_this_month' => $visitsThisMonth,
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
                'text' => "{$stats['returning_customers']} of {$totalCustomers} customers have come back more than once",
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
            'visits_this_month' => 0,
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
                'text' => "{$stats['returning_customers']} returning customers (more than one visit)",
                'tone' => 'positive',
            ];
        }

        return array_slice($insights, 0, 5);
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
}
