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
use Illuminate\Support\Str;

/**
 * Large demo dataset (~6 months of activity).
 *
 * Run: SEED_DEMO_SCALE=1 php artisan db:seed
 * Or:  php artisan db:seed --class=DemoScaleSeeder
 *
 * Keeps existing rows (e.g. owner@example.com venues) and adds more on top.
 */
class DemoScaleSeeder extends Seeder
{
    private const VENUE_COUNT = 150;

    private const GUEST_USER_COUNT = 2400;

    private const TARGET_VISITS = 12_000;

    private const MONTHS_OF_HISTORY = 6;

    private string $passwordHash;

    private SeededRandom $rng;

    private Carbon $historyStart;

    private Carbon $historyEnd;

    /** @var array<int, int> */
    private array $venueStaffIds = [];

    /** @var array<int, list<array{id: int, required_stamps: int}>> */
    private array $venueRewards = [];

    public function run(): void
    {
        $this->passwordHash = Hash::make('password');
        $this->rng = new SeededRandom(20260529);
        $this->historyEnd = now()->endOfDay();
        $this->historyStart = $this->historyEnd->copy()->subMonths(self::MONTHS_OF_HISTORY)->startOfDay();

        $this->command?->info('Demo scale seed: creating venues, users, and rewards…');
        $venueIds = $this->seedVenues();

        $this->command?->info('Demo scale seed: creating guest users…');
        $guestUserIds = $this->seedGuestUsers();

        $this->command?->info('Demo scale seed: enrolling customers at venues…');
        $customers = $this->seedCustomers($venueIds, $guestUserIds);

        $this->command?->info(sprintf(
            'Demo scale seed: simulating ~%s visits over %s months…',
            number_format(self::TARGET_VISITS),
            self::MONTHS_OF_HISTORY,
        ));

        $visitCount = $this->seedVisitsAndLoyalty($customers);

        $this->command?->newLine();
        $this->command?->info('Demo scale seed complete.');
        $this->command?->table(
            ['Metric', 'Count'],
            [
                ['Venues (this run)', number_format(count($venueIds))],
                ['Guest users (this run)', number_format(count($guestUserIds))],
                ['Customer cards (this run)', number_format(count($customers))],
                ['Visits (this run)', number_format($visitCount)],
                ['Total venues', number_format(Venue::query()->count())],
                ['Total customers', number_format(Customer::query()->count())],
                ['Total visits', number_format(Visit::query()->count())],
                ['Total reward unlocks', number_format(RewardUnlock::query()->count())],
                ['Claimed unlocks', number_format(RewardUnlock::query()->whereNotNull('claimed_at')->count())],
            ],
        );
    }

    /**
     * @return list<int>
     */
    private function seedVenues(): array
    {
        $prefixes = ['Blue', 'Golden', 'Urban', 'Harbor', 'North', 'Olive', 'Copper', 'Velvet', 'Sunny', 'Rustic', 'Metro', 'Cedar', 'Willow', 'Crimson', 'Silver', 'Hidden', 'Daily', 'Corner', 'River', 'Market'];
        $nouns = ['Bean', 'Cup', 'Grind', 'Plate', 'Table', 'Garden', 'House', 'Room', 'Lane', 'Fork', 'Flame', 'Roast', 'Bite', 'Sip', 'Social', 'Gather', 'Press', 'Mill', 'Counter', 'Hall'];
        $suffixes = ['Cafe', 'Coffee', 'Kitchen', 'Bistro', 'Bar', 'Bakery', 'Eatery', 'Lounge', 'Grill', 'Taproom'];
        $categories = ['cafe', 'cafe', 'cafe', 'restaurant', 'restaurant', 'bar', 'bakery'];
        $streets = ['Main St', 'Oak Ave', 'Market St', 'River Rd', 'Park Blvd', 'Station Ln', 'Harbor Way', 'Cedar St'];
        $cities = ['San Francisco', 'Oakland', 'Berkeley', 'San Jose', 'Portland', 'Seattle', 'Austin', 'Denver', 'Chicago', 'Boston'];

        $venueIds = [];
        $usedSlugs = Venue::query()->pluck('slug')->all();

        for ($i = 0; $i < self::VENUE_COUNT; $i++) {
            $category = $this->rng->randomElement($categories);
            $name = $this->rng->randomElement($prefixes).' '.$this->rng->randomElement($nouns).' '.$this->rng->randomElement($suffixes);
            $slug = $this->uniqueSlug($name, $usedSlugs);
            $usedSlugs[] = $slug;

            $owner = User::query()->create([
                'name' => $this->rng->name(),
                'email' => "scale-owner-{$slug}@demo.flotory.test",
                'password' => $this->passwordHash,
                'is_admin' => false,
            ]);

            $city = $this->rng->randomElement($cities);
            $coordinates = $this->coordinatesForCity($city);

            $venue = Venue::query()->create([
                'name' => $name,
                'slug' => $slug,
                'category' => $category,
                'address' => $this->rng->buildingNumber().' '.$this->rng->randomElement($streets).', '.$city,
                'latitude' => $coordinates['latitude'],
                'longitude' => $coordinates['longitude'],
                'phone' => $this->rng->numerify('###-###-####'),
                'website' => "https://{$slug}.example.com",
                'status' => Venue::STATUS_PUBLISHED,
                'published_at' => $this->randomPastTimestamp(30, 90),
                'created_at' => $this->randomPastTimestamp(120, 150),
                'updated_at' => now(),
            ]);

            $owner->forceFill(['active_venue_id' => $venue->id])->save();

            VenueUser::query()->create([
                'venue_id' => $venue->id,
                'user_id' => $owner->id,
                'role' => 'owner',
            ]);

            $staffCount = $this->rng->numberBetween(1, 2);
            $staffIds = [];

            for ($s = 0; $s < $staffCount; $s++) {
                $staff = User::query()->create([
                    'name' => $this->rng->name(),
                    'email' => "scale-staff-{$slug}-{$s}@demo.flotory.test",
                    'password' => $this->passwordHash,
                    'is_admin' => false,
                    'active_venue_id' => $venue->id,
                ]);

                VenueUser::query()->create([
                    'venue_id' => $venue->id,
                    'user_id' => $staff->id,
                    'role' => 'staff',
                ]);

                $staffIds[] = $staff->id;
            }

            $this->venueStaffIds[$venue->id] = $staffIds[0];

            $milestones = $this->milestonesForCategory($category);
            $rewardRows = [];

            foreach ($milestones as [$stamps, $title, $description]) {
                $reward = Reward::query()->create([
                    'venue_id' => $venue->id,
                    'title' => $title,
                    'description' => $description,
                    'required_stamps' => $stamps,
                    'sort_order' => $stamps,
                    'reward_type' => 'milestone',
                    'active' => $this->rng->boolean(92),
                    'created_at' => $venue->created_at,
                    'updated_at' => now(),
                ]);

                $rewardRows[] = [
                    'id' => $reward->id,
                    'required_stamps' => $stamps,
                ];
            }

            $this->venueRewards[$venue->id] = $rewardRows;
            $venueIds[] = $venue->id;
        }

        return $venueIds;
    }

    /**
     * @return list<int>
     */
    private function seedGuestUsers(): array
    {
        $ids = [];
        $now = now();

        for ($batch = 0; $batch < ceil(self::GUEST_USER_COUNT / 200); $batch++) {
            $rows = [];
            $start = $batch * 200;

            for ($i = 0; $i < 200 && ($start + $i) < self::GUEST_USER_COUNT; $i++) {
                $index = $start + $i;
                $joinedAt = $this->randomPastTimestamp(10, 170);

                $rows[] = [
                    'name' => $this->rng->name(),
                    'email' => "scale-guest-{$index}@demo.flotory.test",
                    'password' => $this->passwordHash,
                    'is_admin' => false,
                    'active_venue_id' => null,
                    'created_at' => $joinedAt,
                    'updated_at' => $now,
                ];
            }

            foreach (array_chunk($rows, 100) as $chunk) {
                DB::table('users')->insert($chunk);
            }
        }

        return User::query()
            ->where('email', 'like', 'scale-guest-%@demo.flotory.test')
            ->orderBy('id')
            ->pluck('id')
            ->all();
    }

    /**
     * @param  list<int>  $venueIds
     * @param  list<int>  $guestUserIds
     * @return list<array{customer_id: int, venue_id: int, user_id: int, rewards: list<array{id: int, required_stamps: int}>, staff_id: int, joined_at: Carbon}>
     */
    private function seedCustomers(array $venueIds, array $guestUserIds): array
    {
        $customers = [];
        $this->rng->shuffle($guestUserIds);

        foreach ($guestUserIds as $offset => $userId) {
            $venueCount = $this->rng->boolean(78) ? 1 : 2;
            $pickedVenues = $this->rng->randomElements($venueIds, min($venueCount, count($venueIds)));

            foreach ($pickedVenues as $venueId) {
                $joinedAt = $this->randomPastTimestamp(14, 175);

                $customer = Customer::query()->create([
                    'venue_id' => $venueId,
                    'user_id' => $userId,
                    'qr_token' => (string) Str::uuid(),
                    'stamps' => 0,
                    'created_at' => $joinedAt,
                    'updated_at' => now(),
                ]);

                CustomerRewardCycle::query()->create([
                    'customer_id' => $customer->id,
                    'cycle_number' => 1,
                    'completed_at' => null,
                    'created_at' => $joinedAt,
                    'updated_at' => now(),
                ]);

                $customers[] = [
                    'customer_id' => $customer->id,
                    'venue_id' => $venueId,
                    'user_id' => $userId,
                    'rewards' => $this->venueRewards[$venueId],
                    'staff_id' => $this->venueStaffIds[$venueId],
                    'joined_at' => $joinedAt,
                ];
            }
        }

        return $customers;
    }

    /**
     * @param  list<array{customer_id: int, venue_id: int, user_id: int, rewards: list<array{id: int, required_stamps: int}>, staff_id: int, joined_at: Carbon}>  $customers
     */
    private function seedVisitsAndLoyalty(array $customers): int
    {
        if ($customers === []) {
            return 0;
        }

        $totalCustomers = count($customers);
        $visitBudget = self::TARGET_VISITS;
        $visitRows = [];
        $totalVisits = 0;
        $flushSize = 800;

        foreach ($customers as $index => $profile) {
            $remainingCustomers = $totalCustomers - $index;
            $remainingBudget = $visitBudget - $totalVisits;
            $avg = max(1, (int) round($remainingBudget / max(1, $remainingCustomers)));
            $visitTarget = $this->rng->numberBetween(max(1, $avg - 3), $avg + 5);
            $visitTarget = min($visitTarget, $remainingBudget);

            $totalVisits += $this->simulateCustomer(
                $profile,
                $visitTarget,
                $visitRows,
                $flushSize,
            );
        }

        $this->flushVisitRows($visitRows);

        return $totalVisits;
    }

    /**
     * @param  array{customer_id: int, venue_id: int, user_id: int, rewards: list<array{id: int, required_stamps: int}>, staff_id: int, joined_at: Carbon}  $profile
     * @param  list<array<string, mixed>>  $visitRows
     */
    private function simulateCustomer(array $profile, int $visitTarget, array &$visitRows, int $flushSize): int
    {
        $rewards = collect($profile['rewards'])->sortBy('required_stamps')->values()->all();

        if ($rewards === []) {
            return 0;
        }

        $maxStamps = (int) $rewards[array_key_last($rewards)]['required_stamps'];
        $stamps = 0;
        $cycle = 1;
        $unlockedIds = [];
        $created = 0;
        $start = $profile['joined_at']->greaterThan($this->historyStart)
            ? $profile['joined_at']
            : $this->historyStart;

        for ($v = 0; $v < $visitTarget; $v++) {
            $at = $this->randomTimestampBetween($start, $this->historyEnd);
            $added = $this->rng->boolean(8) ? 2 : 1;
            $stamps = min($stamps + $added, $maxStamps + 4);

            $visitRows[] = [
                'customer_id' => $profile['customer_id'],
                'venue_id' => $profile['venue_id'],
                'created_by' => $profile['staff_id'],
                'created_at' => $at,
            ];
            $created++;

            if (count($visitRows) >= $flushSize) {
                $this->flushVisitRows($visitRows);
            }

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
                ]);

                $unlockedIds[] = $reward['id'];

                if ($this->shouldClaimUnlock($at)) {
                    $unlock->forceFill([
                        'claimed_at' => $at->copy()->addHours($this->rng->numberBetween(2, 96)),
                        'claimed_by' => $profile['staff_id'],
                    ])->save();
                }
            }

            if ($stamps >= $maxStamps && $this->rng->boolean(35)) {
                CustomerRewardCycle::query()
                    ->where('customer_id', $profile['customer_id'])
                    ->where('cycle_number', $cycle)
                    ->whereNull('completed_at')
                    ->update(['completed_at' => $at]);

                $cycle++;
                $stamps = $this->rng->numberBetween(0, 3);
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

        Customer::query()->whereKey($profile['customer_id'])->update([
            'stamps' => $stamps,
            'updated_at' => now(),
        ]);

        return $created;
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

    private function shouldClaimUnlock(Carbon $unlockedAt): bool
    {
        $daysAgo = $unlockedAt->diffInDays($this->historyEnd);

        if ($daysAgo > 45) {
            return $this->rng->boolean(72);
        }

        if ($daysAgo > 14) {
            return $this->rng->boolean(48);
        }

        return $this->rng->boolean(18);
    }

    /**
     * @return list<array{0: int, 1: string, 2: string}>
     */
    private function milestonesForCategory(string $category): array
    {
        return match ($category) {
            'restaurant' => [
                [5, '50% off one starter', 'Half price on any starter after your fifth stamp.'],
                [10, 'Free starter', 'A complimentary starter on the house.'],
                [15, 'Free dessert', 'A sweet finish on us.'],
            ],
            'bar' => [
                [5, '50% off one cocktail', 'Half price on any signature cocktail.'],
                [10, 'Free cocktail', 'A complimentary cocktail on the house.'],
                [12, 'VIP bar priority', 'Skip the line on busy nights.'],
            ],
            'bakery' => [
                [5, '50% off one pastry', 'Half price on any pastry.'],
                [8, 'Free pastry', 'A complimentary pastry from the counter.'],
                [12, 'Free coffee + pastry', 'Coffee and pastry bundle reward.'],
            ],
            default => [
                [5, '50% off one coffee', 'Half price on any coffee drink.'],
                [10, 'Free coffee', 'A complimentary coffee on the house.'],
                [15, 'Free drink', 'Any drink up to barista choice.'],
            ],
        };
    }

    /**
     * @param  list<string>  $usedSlugs
     */
    private function uniqueSlug(string $name, array $usedSlugs): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;

        while (in_array($slug, $usedSlugs, true)) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * @return array{latitude: float, longitude: float}
     */
    private function coordinatesForCity(string $city): array
    {
        $centers = [
            'San Francisco' => [37.7749, -122.4194],
            'Oakland' => [37.8044, -122.2712],
            'Berkeley' => [37.8715, -122.2730],
            'San Jose' => [37.3382, -121.8863],
            'Portland' => [45.5152, -122.6784],
            'Seattle' => [47.6062, -122.3321],
            'Austin' => [30.2672, -97.7431],
            'Denver' => [39.7392, -104.9903],
            'Chicago' => [41.8781, -87.6298],
            'Boston' => [42.3601, -71.0589],
        ];

        [$lat, $lng] = $centers[$city] ?? [37.7749, -122.4194];

        return [
            'latitude' => round($lat + $this->rng->randomFloat(4, -0.02, 0.02), 7),
            'longitude' => round($lng + $this->rng->randomFloat(4, -0.02, 0.02), 7),
        ];
    }

    private function randomPastTimestamp(int $minDaysAgo, int $maxDaysAgo): Carbon
    {
        return $this->historyEnd
            ->copy()
            ->subDays($this->rng->numberBetween($minDaysAgo, $maxDaysAgo))
            ->setTime($this->rng->numberBetween(7, 21), $this->rng->numberBetween(0, 59));
    }

    private function randomTimestampBetween(Carbon $start, Carbon $end): Carbon
    {
        if ($end->lessThanOrEqualTo($start)) {
            return $start->copy();
        }

        return Carbon::createFromTimestamp(
            $this->rng->numberBetween($start->timestamp, $end->timestamp),
        )->setTime($this->rng->numberBetween(7, 22), $this->rng->randomElement([0, 10, 15, 20, 30, 45]));
    }
}
