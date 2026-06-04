<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\RewardUnlock;
use App\Models\Venue;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class CustomerRetentionService
{
    public const ACTIVE_WITHIN_DAYS = 14;

    public const INACTIVE_AFTER_DAYS = 30;

    public function listQuery(Venue $venue, ?string $activity = null, string $sort = 'last_visit'): Builder
    {
        $query = $this->baseCustomerQuery($venue);

        $activity = $activity ? strtolower($activity) : 'all';

        if ($activity === 'active') {
            $query->whereRaw(
                '(select max(created_at) from visits where visits.customer_id = customers.id) >= ?',
                [now()->subDays(self::ACTIVE_WITHIN_DAYS)],
            );
        } elseif ($activity === 'inactive') {
            $query->where(function (Builder $builder): void {
                $builder
                    ->whereRaw(
                        '(select max(created_at) from visits where visits.customer_id = customers.id) < ?',
                        [now()->subDays(self::INACTIVE_AFTER_DAYS)],
                    )
                    ->orWhere(function (Builder $nested): void {
                        $nested
                            ->whereDoesntHave('visits')
                            ->where('customers.created_at', '<', now()->subDays(self::INACTIVE_AFTER_DAYS));
                    });
            });
        } elseif ($activity === 'new') {
            $query
                ->where('customers.created_at', '>=', now()->subDays(self::ACTIVE_WITHIN_DAYS))
                ->has('visits', '<=', 1);
        }

        return match ($sort) {
            'joined' => $query->orderByDesc('customers.created_at'),
            'visits' => $query->orderByDesc('visits_count')->orderByDesc('customers.created_at'),
            'claimed' => $query->orderByDesc('rewards_claimed_count')->orderByDesc('customers.created_at'),
            default => $query
                ->orderByRaw('last_visit_at IS NULL')
                ->orderByDesc('last_visit_at')
                ->orderByDesc('customers.created_at'),
        };
    }

    public function baseCustomerQuery(Venue $venue): Builder
    {
        return Customer::query()
            ->where('venue_id', $venue->id)
            ->with('user:id,name,email,birthday')
            ->withCount('visits')
            ->withCount([
                'rewardUnlocks as rewards_unlocked_count',
                'rewardUnlocks as rewards_claimed_count' => fn (Builder $query) => $query->whereNotNull('claimed_at'),
            ])
            ->addSelect([
                'customers.*',
                DB::raw('(select max(created_at) from visits where visits.customer_id = customers.id) as last_visit_at'),
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatListCustomer(Customer $customer): array
    {
        $lastVisitAt = $customer->last_visit_at
            ? Carbon::parse($customer->last_visit_at)
            : null;
        $joinedAt = $customer->created_at;

        return [
            'id' => $customer->id,
            'venue_id' => $customer->venue_id,
            'user_id' => $customer->user_id,
            'stamps' => $customer->stamps,
            'joined_at' => $joinedAt?->toIso8601String(),
            'last_visit_at' => $lastVisitAt?->toIso8601String(),
            'visits_count' => (int) $customer->visits_count,
            'rewards_unlocked_count' => (int) ($customer->rewards_unlocked_count ?? 0),
            'rewards_claimed_count' => (int) ($customer->rewards_claimed_count ?? 0),
            'activity_status' => $this->resolveActivityStatus(
                $lastVisitAt,
                $joinedAt,
                (int) $customer->visits_count,
            ),
            'user' => $customer->user ? [
                'id' => $customer->user->id,
                'name' => $customer->user->name,
                'email' => $customer->user->email,
                'birthday' => $customer->user->birthday?->toDateString(),
            ] : null,
        ];
    }

    public function resolveActivityStatus(?Carbon $lastVisitAt, ?Carbon $joinedAt, int $visitsCount): string
    {
        if ($visitsCount === 0) {
            return $joinedAt && $joinedAt->greaterThanOrEqualTo(now()->subDays(self::ACTIVE_WITHIN_DAYS))
                ? 'new'
                : 'inactive';
        }

        if ($lastVisitAt && $lastVisitAt->greaterThanOrEqualTo(now()->subDays(self::ACTIVE_WITHIN_DAYS))) {
            return 'active';
        }

        if (! $lastVisitAt || $lastVisitAt->lessThan(now()->subDays(self::INACTIVE_AFTER_DAYS))) {
            return 'inactive';
        }

        return 'cooling';
    }

    /**
     * @return array<string, mixed>
     */
    public function buildProfile(Customer $customer): array
    {
        $customer->loadMissing('user:id,name,email,birthday');

        $lastVisitAt = Visit::query()
            ->where('customer_id', $customer->id)
            ->max('created_at');

        $visitsCount = Visit::query()->where('customer_id', $customer->id)->count();
        $rewardsClaimedCount = RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->whereNotNull('claimed_at')
            ->count();
        $rewardsUnlockedCount = RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->count();

        $lastVisitCarbon = $lastVisitAt ? Carbon::parse($lastVisitAt) : null;

        $visits = Visit::query()
            ->where('customer_id', $customer->id)
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (Visit $visit) => [
                'id' => $visit->id,
                'created_at' => $visit->created_at?->toIso8601String(),
                'staff_name' => $visit->creator?->name,
            ]);

        $rewardHistory = RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->with(['reward:id,title,required_stamps', 'claimedBy:id,name'])
            ->orderByDesc('unlocked_at')
            ->limit(50)
            ->get()
            ->map(fn (RewardUnlock $unlock) => [
                'id' => $unlock->id,
                'reward_id' => $unlock->reward_id,
                'title' => $unlock->reward?->title,
                'required_stamps' => $unlock->reward?->required_stamps,
                'cycle_number' => $unlock->cycle_number,
                'unlocked_at' => $unlock->unlocked_at?->toIso8601String(),
                'claimed_at' => $unlock->claimed_at?->toIso8601String(),
                'claimed_by_name' => $unlock->claimedBy?->name,
            ]);

        $notes = $customer->notes()
            ->with('author:id,name')
            ->limit(30)
            ->get()
            ->map(fn ($note) => [
                'id' => $note->id,
                'body' => $note->body,
                'author_name' => $note->author?->name,
                'created_at' => $note->created_at?->toIso8601String(),
            ]);

        $customer->setAttribute('visits_count', $visitsCount);
        $customer->setAttribute('rewards_claimed_count', $rewardsClaimedCount);
        $customer->setAttribute('rewards_unlocked_count', $rewardsUnlockedCount);
        $customer->setAttribute('last_visit_at', $lastVisitAt);

        return [
            'customer' => $this->formatListCustomer($customer->load('user:id,name,email,birthday')),
            'stats' => [
                'joined_at' => $customer->created_at?->toIso8601String(),
                'last_visit_at' => $lastVisitCarbon?->toIso8601String(),
                'visits_count' => $visitsCount,
                'rewards_claimed_count' => $rewardsClaimedCount,
                'rewards_unlocked_count' => $rewardsUnlockedCount,
                'stamps' => $customer->stamps,
                'activity_status' => $this->resolveActivityStatus(
                    $lastVisitCarbon,
                    $customer->created_at,
                    $visitsCount,
                ),
            ],
            'visits' => $visits,
            'reward_history' => $rewardHistory,
            'notes' => $notes,
            'timeline' => $this->buildTimeline($customer),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function buildTimeline(Customer $customer): array
    {
        $events = collect();

        $events->push([
            'type' => 'joined',
            'occurred_at' => $customer->created_at?->toIso8601String(),
            'title' => 'Joined loyalty program',
            'detail' => null,
        ]);

        Visit::query()
            ->where('customer_id', $customer->id)
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->each(function (Visit $visit) use ($events): void {
                $events->push([
                    'type' => 'visit',
                    'occurred_at' => $visit->created_at?->toIso8601String(),
                    'title' => 'Visit recorded',
                    'detail' => $visit->creator?->name
                        ? 'Stamp added by '.$visit->creator->name
                        : 'Stamp added',
                ]);
            });

        RewardUnlock::query()
            ->where('customer_id', $customer->id)
            ->with(['reward:id,title,required_stamps', 'claimedBy:id,name'])
            ->orderByDesc('unlocked_at')
            ->limit(100)
            ->get()
            ->each(function (RewardUnlock $unlock) use ($events): void {
                $events->push([
                    'type' => 'milestone_unlocked',
                    'occurred_at' => $unlock->unlocked_at?->toIso8601String(),
                    'title' => 'Unlocked: '.($unlock->reward?->title ?? 'Reward'),
                    'detail' => $unlock->reward
                        ? $unlock->reward->required_stamps.' stamps'
                        : null,
                ]);

                if ($unlock->claimed_at) {
                    $events->push([
                        'type' => 'redemption',
                        'occurred_at' => $unlock->claimed_at->toIso8601String(),
                        'title' => 'Redeemed: '.($unlock->reward?->title ?? 'Reward'),
                        'detail' => $unlock->claimedBy?->name
                            ? 'Claimed with '.$unlock->claimedBy->name
                            : 'Reward claimed at venue',
                    ]);
                }
            });

        CustomerRewardCycle::query()
            ->where('customer_id', $customer->id)
            ->whereNotNull('completed_at')
            ->orderByDesc('completed_at')
            ->limit(20)
            ->get()
            ->each(function (CustomerRewardCycle $cycle) use ($events): void {
                $events->push([
                    'type' => 'cycle_completed',
                    'occurred_at' => $cycle->completed_at?->toIso8601String(),
                    'title' => 'Completed loyalty cycle #'.$cycle->cycle_number,
                    'detail' => 'Stamps reset for next round',
                ]);
            });

        return $events
            ->filter(fn (array $event) => ! empty($event['occurred_at']))
            ->sortByDesc('occurred_at')
            ->values()
            ->all();
    }

    public function activitySummary(Venue $venue): array
    {
        $customers = $this->baseCustomerQuery($venue)->get();

        $summary = [
            'total' => $customers->count(),
            'active' => 0,
            'inactive' => 0,
            'new' => 0,
            'cooling' => 0,
        ];

        foreach ($customers as $customer) {
            $lastVisitAt = $customer->last_visit_at
                ? Carbon::parse($customer->last_visit_at)
                : null;
            $status = $this->resolveActivityStatus(
                $lastVisitAt,
                $customer->created_at,
                (int) $customer->visits_count,
            );
            $summary[$status] = ($summary[$status] ?? 0) + 1;
        }

        return $summary;
    }
}
