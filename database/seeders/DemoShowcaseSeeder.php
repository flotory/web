<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Rich single-venue demo data for sales walkthroughs and local dev.
 *
 * Seeds ~12 months of visits, unlocks, and claims for Demo Cafe only.
 */
class DemoShowcaseSeeder extends Seeder
{
    public const MONTHS_OF_HISTORY = 12;

    public const GUEST_COUNT = 280;

    public const MIN_MONTHLY_VISITS = 50;

    public const MAX_MONTHLY_VISITS = 150;

    public const DEMO_CUSTOMER_EMAIL = 'customer@example.com';

    private string $passwordHash;

    private SeededRandom $rng;

    private Carbon $historyStart;

    private Carbon $historyEnd;

    /** @var list<array{id: int, required_stamps: int}> */
    private array $rewards = [];

    private int $ownerId;

    public function run(): void
    {
        $venue = Venue::query()->where('slug', 'demo-cafe')->firstOrFail();
        $this->ownerId = (int) VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('role', 'owner')
            ->value('user_id');

        $this->passwordHash = Hash::make('password');
        $this->rng = new SeededRandom(20260703);
        $this->historyEnd = now()->endOfDay();
        $this->historyStart = $this->historyEnd->copy()->subMonths(self::MONTHS_OF_HISTORY)->startOfDay();

        $this->rewards = Reward::query()
            ->where('venue_id', $venue->id)
            ->where('active', true)
            ->where('reward_type', 'milestone')
            ->orderBy('required_stamps')
            ->get(['id', 'required_stamps'])
            ->map(fn (Reward $reward) => ['id' => $reward->id, 'required_stamps' => $reward->required_stamps])
            ->all();

        if ($this->rewards === []) {
            throw new \RuntimeException('Demo Cafe needs milestone rewards before DemoShowcaseSeeder runs.');
        }

        $this->command?->info('Demo showcase: resetting Demo Cafe loyalty data…');
        $this->purgeVenueLoyalty($venue);

        $this->command?->info('Demo showcase: creating guest accounts…');
        $profiles = $this->seedGuests($venue);

        $monthlyPlan = $this->buildMonthlyVisitPlan();
        $plannedVisits = array_sum(array_column($monthlyPlan, 'visits'));

        $this->command?->info(sprintf(
            'Demo showcase: simulating %s visits across %s months (%s–%s per month)…',
            number_format($plannedVisits),
            self::MONTHS_OF_HISTORY,
            number_format(self::MIN_MONTHLY_VISITS),
            number_format(self::MAX_MONTHLY_VISITS),
        ));

        $visitCount = $this->seedVisits($profiles, $monthlyPlan);

        $this->command?->info('Demo showcase complete.');
        $this->command?->table(
            ['Metric', 'Count'],
            [
                ['Customers', number_format(Customer::query()->where('venue_id', $venue->id)->count())],
                ['Visits', number_format($visitCount)],
                ['Reward unlocks', number_format(RewardUnlock::query()->whereHas('reward', fn ($q) => $q->where('venue_id', $venue->id))->count())],
                ['Rewards claimed', number_format(RewardUnlock::query()->whereHas('reward', fn ($q) => $q->where('venue_id', $venue->id))->whereNotNull('claimed_at')->count())],
            ],
        );
    }

    private function purgeVenueLoyalty(Venue $venue): void
    {
        $customerIds = Customer::query()->where('venue_id', $venue->id)->pluck('id');

        Visit::query()->where('venue_id', $venue->id)->delete();
        RewardUnlock::query()->whereIn('customer_id', $customerIds)->delete();
        CustomerRewardCycle::query()->whereIn('customer_id', $customerIds)->delete();
        Customer::query()->where('venue_id', $venue->id)->delete();

        User::query()
            ->where('email', 'like', 'demo-guest-%@demo.flotory.test')
            ->delete();
    }

    /**
     * @return list<array{customer_id: int, user_id: int, joined_at: Carbon, is_demo_customer: bool}>
     */
    private function seedGuests(Venue $venue): array
    {
        $profiles = [];
        $now = now();

        $seedUsers = [
            ['email' => self::DEMO_CUSTOMER_EMAIL, 'name' => 'Demo Customer', 'joined_days_ago' => 340, 'is_demo_customer' => true],
        ];

        for ($index = 1; $index <= self::GUEST_COUNT; $index++) {
            $seedUsers[] = [
                'email' => sprintf('demo-guest-%03d@demo.flotory.test', $index),
                'name' => $this->rng->name(),
                'joined_days_ago' => $this->rng->numberBetween(10, 360),
                'is_demo_customer' => false,
            ];
        }

        foreach ($seedUsers as $seedUser) {
            $user = User::updateOrCreate(
                ['email' => $seedUser['email']],
                [
                    'name' => $seedUser['name'],
                    'password' => $this->passwordHash,
                    'is_admin' => false,
                    'active_venue_id' => null,
                ],
            );

            $joinedAt = $this->historyEnd->copy()->subDays($seedUser['joined_days_ago'])->setTime(12, 0);

            $customer = Customer::query()->create([
                'venue_id' => $venue->id,
                'user_id' => $user->id,
                'stamps' => 0,
                'created_at' => $joinedAt,
                'updated_at' => $now,
            ]);

            CustomerRewardCycle::query()->create([
                'customer_id' => $customer->id,
                'cycle_number' => 1,
                'completed_at' => null,
                'created_at' => $joinedAt,
                'updated_at' => $now,
            ]);

            $profiles[] = [
                'customer_id' => $customer->id,
                'user_id' => $user->id,
                'venue_id' => $venue->id,
                'joined_at' => $joinedAt,
                'is_demo_customer' => $seedUser['is_demo_customer'],
            ];
        }

        return $profiles;
    }

    /**
     * @param  list<array{customer_id: int, user_id: int, venue_id: int, joined_at: Carbon, is_demo_customer: bool}>  $profiles
     * @param  list<array{key: string, visits: int, range_start: Carbon, range_end: Carbon}>  $monthlyPlan
     */
    private function seedVisits(array $profiles, array $monthlyPlan): int
    {
        if ($profiles === []) {
            return 0;
        }

        $visitRows = [];
        $totalVisits = 0;

        foreach ($monthlyPlan as $month) {
            $eligibleProfiles = array_values(array_filter(
                $profiles,
                fn (array $profile): bool => $profile['joined_at']->lessThanOrEqualTo($month['range_end']),
            ));

            if ($eligibleProfiles === []) {
                continue;
            }

            for ($visitIndex = 0; $visitIndex < $month['visits']; $visitIndex++) {
                $profile = $this->rng->randomElement($eligibleProfiles);

                $visitRows[] = [
                    'customer_id' => $profile['customer_id'],
                    'venue_id' => $profile['venue_id'],
                    'created_by' => $this->ownerId,
                    'created_at' => $this->randomTimestampInRange($month['range_start'], $month['range_end']),
                ];
                $totalVisits++;

                if (count($visitRows) >= 500) {
                    $this->flushVisitRows($visitRows);
                }
            }
        }

        $this->flushVisitRows($visitRows);
        $this->replayLoyaltyForProfiles($profiles);

        return $totalVisits;
    }

    /**
     * @param  list<array{customer_id: int, user_id: int, venue_id: int, joined_at: Carbon, is_demo_customer: bool}>  $profiles
     */
    private function replayLoyaltyForProfiles(array $profiles): void
    {
        foreach ($profiles as $profile) {
            $this->replayLoyaltyForCustomer($profile);
        }
    }

    /**
     * @param  array{customer_id: int, user_id: int, venue_id: int, joined_at: Carbon, is_demo_customer: bool}  $profile
     */
    private function replayLoyaltyForCustomer(array $profile): void
    {
        $rewards = collect($this->rewards)->sortBy('required_stamps')->values()->all();
        $maxStamps = (int) $rewards[array_key_last($rewards)]['required_stamps'];
        $stamps = 0;
        $cycle = 1;
        $unlockedIds = [];

        $visits = Visit::query()
            ->where('customer_id', $profile['customer_id'])
            ->orderBy('created_at')
            ->get(['created_at']);

        foreach ($visits as $visit) {
            $at = $visit->created_at instanceof Carbon ? $visit->created_at : Carbon::parse($visit->created_at);
            $stamps = min($stamps + ($this->rng->boolean(9) ? 2 : 1), $maxStamps + 4);

            foreach ($rewards as $reward) {
                if ($reward['required_stamps'] > $stamps) {
                    break;
                }

                if (in_array($reward['id'], $unlockedIds, true)) {
                    continue;
                }

                $unlock = RewardUnlock::query()->create([
                    'customer_id' => $profile['customer_id'],
                    'reward_id' => $reward['id'],
                    'cycle_number' => $cycle,
                    'unlocked_at' => $at,
                    'created_at' => $at,
                    'updated_at' => $at,
                ]);

                $unlockedIds[] = $reward['id'];

                if ($this->shouldClaimUnlock($at)) {
                    $unlock->forceFill([
                        'claimed_at' => $at->copy()->addHours($this->rng->numberBetween(4, 72)),
                        'claimed_by' => $profile['user_id'],
                    ])->save();
                }
            }

            if ($stamps >= $maxStamps && $this->rng->boolean(30)) {
                CustomerRewardCycle::query()
                    ->where('customer_id', $profile['customer_id'])
                    ->where('cycle_number', $cycle)
                    ->whereNull('completed_at')
                    ->update(['completed_at' => $at]);

                $cycle++;
                $stamps = $profile['is_demo_customer'] ? 7 : $this->rng->numberBetween(0, 4);
                $unlockedIds = [];

                CustomerRewardCycle::query()->create([
                    'customer_id' => $profile['customer_id'],
                    'cycle_number' => $cycle,
                    'completed_at' => null,
                    'created_at' => $at,
                    'updated_at' => $at,
                ]);
            }
        }

        if ($profile['is_demo_customer']) {
            $stamps = 7;
        }

        Customer::query()->whereKey($profile['customer_id'])->update([
            'stamps' => $stamps,
            'updated_at' => now(),
        ]);
    }

    /**
     * @return list<array{key: string, visits: int, range_start: Carbon, range_end: Carbon}>
     */
    private function buildMonthlyVisitPlan(): array
    {
        $plan = [];

        for ($offset = self::MONTHS_OF_HISTORY - 1; $offset >= 0; $offset--) {
            $monthStart = now()->startOfMonth()->subMonths($offset);
            $monthEnd = $monthStart->copy()->endOfMonth();
            $rangeEnd = $monthEnd->lessThan($this->historyEnd) ? $monthEnd : $this->historyEnd->copy();
            $ageIndex = self::MONTHS_OF_HISTORY - 1 - $offset;
            $center = self::MIN_MONTHLY_VISITS
                + ($ageIndex / max(1, self::MONTHS_OF_HISTORY - 1))
                * (self::MAX_MONTHLY_VISITS - self::MIN_MONTHLY_VISITS);

            $visits = $this->rng->numberBetween(
                max(self::MIN_MONTHLY_VISITS, (int) round($center) - 12),
                min(self::MAX_MONTHLY_VISITS, (int) round($center) + 12),
            );

            if ($offset === 0) {
                $dayFraction = now()->day / now()->daysInMonth();
                $visits = max(
                    self::MIN_MONTHLY_VISITS,
                    min(self::MAX_MONTHLY_VISITS, (int) round($visits * max(0.12, $dayFraction))),
                );
            }

            $plan[] = [
                'key' => $monthStart->format('Y-m'),
                'visits' => $visits,
                'range_start' => $monthStart->copy()->setTime(8, 0),
                'range_end' => $rangeEnd,
            ];
        }

        return $plan;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function flushVisitRows(array &$rows): void
    {
        if ($rows === []) {
            return;
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('visits')->insert($chunk);
        }

        $rows = [];
    }

    private function randomTimestampInRange(Carbon $rangeStart, Carbon $rangeEnd): Carbon
    {
        return Carbon::createFromTimestamp(
            $this->rng->numberBetween($rangeStart->timestamp, $rangeEnd->timestamp),
        )->setTime($this->rng->numberBetween(8, 20), $this->rng->randomElement([0, 10, 15, 20, 30, 45]));
    }

    private function shouldClaimUnlock(Carbon $unlockedAt): bool
    {
        $daysAgo = $unlockedAt->diffInDays($this->historyEnd);

        if ($daysAgo <= 35) {
            return $this->rng->boolean(58);
        }

        if ($daysAgo > 60) {
            return $this->rng->boolean(72);
        }

        return $this->rng->boolean(46);
    }
}
