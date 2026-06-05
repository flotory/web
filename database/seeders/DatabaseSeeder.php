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
use App\Services\LoyaltyStampService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AdminUserSeeder::class);

        $owner = User::updateOrCreate(
            ['email' => 'owner@example.com'],
            [
                'name' => 'Demo Owner',
                'password' => 'password',
                'is_admin' => false,
            ],
        );

        $venues = collect([
            ['name' => 'Demo Cafe', 'slug' => 'demo-cafe', 'category' => 'cafe', 'address' => '12 Market Street, Toruń'],
            ['name' => 'Harbor Coffee', 'slug' => 'harbor-coffee', 'category' => 'cafe', 'address' => '8 Harbor Road, Gdańsk'],
            ['name' => 'North Star Burgers', 'slug' => 'north-star-burgers', 'category' => 'restaurant'],
            ['name' => 'Olive Street Kitchen', 'slug' => 'olive-street-kitchen', 'category' => 'restaurant'],
        ])->map(fn (array $data) => Venue::updateOrCreate(
            ['slug' => $data['slug']],
            [
                'name' => $data['name'],
                'category' => $data['category'],
                'address' => $data['address'] ?? null,
            ],
        ));

        $venue = $venues->first();

        $owner->forceFill(['active_venue_id' => $venue->id])->save();

        $staff = User::updateOrCreate(
            ['email' => 'staff@example.com'],
            [
                'name' => 'Demo Staff',
                'password' => 'password',
                'is_admin' => false,
                'active_venue_id' => $venue->id,
            ],
        );

        VenueUser::updateOrCreate(
            [
                'venue_id' => $venue->id,
                'user_id' => $staff->id,
            ],
            [
                'role' => 'staff',
            ],
        );

        $venues->each(function (Venue $venue) use ($owner): void {
            VenueUser::updateOrCreate([
                'venue_id' => $venue->id,
                'user_id' => $owner->id,
            ], [
                'role' => 'owner',
            ]);

            $milestones = match ($venue->category) {
                'restaurant' => [
                    [5, '50% off one starter', 'Half price on any starter after your fifth stamp.'],
                    [10, 'Free starter', 'A complimentary starter on the house.'],
                    [15, 'Free starter', 'Another free starter for returning guests.'],
                ],
                'bar' => [
                    [5, '50% off one cocktail', 'Half price on any signature cocktail after your fifth stamp.'],
                    [10, 'Free cocktail', 'A complimentary cocktail on the house.'],
                    [15, 'Free cocktail', 'Another free cocktail for your best regulars.'],
                ],
                'bakery' => [
                    [5, '50% off one pastry', 'Half price on any pastry after your fifth stamp.'],
                    [10, 'Free pastry', 'A complimentary pastry from the counter.'],
                    [15, 'Free pastry', 'Another free pastry for loyal guests.'],
                ],
                default => [
                    [5, '50% off one coffee', 'Half price on any coffee drink after your fifth stamp.'],
                    [10, 'Free coffee', 'A complimentary coffee on the house.'],
                    [15, 'Free coffee', 'Another free coffee for your most loyal regulars.'],
                ],
            };

            foreach ($milestones as [$stamps, $title, $description]) {
                Reward::updateOrCreate([
                    'venue_id' => $venue->id,
                    'required_stamps' => $stamps,
                ], [
                    'title' => $title,
                    'description' => $description,
                    'reward_type' => 'milestone',
                    'sort_order' => $stamps,
                    'active' => true,
                ]);
            }
        });

        $customerProfiles = [
            ['name' => 'Demo Customer', 'email' => 'customer@example.com'],
            ['name' => 'Maya Chen', 'email' => 'maya@example.com'],
            ['name' => 'Alex Morgan', 'email' => 'alex@example.com'],
            ['name' => 'Sam Rivera', 'email' => 'sam@example.com'],
            ['name' => 'Nora Bell', 'email' => 'nora@example.com'],
            ['name' => 'Leo Martin', 'email' => 'leo@example.com'],
            ['name' => 'Amara Stone', 'email' => 'amara@example.com'],
            ['name' => 'Theo Brown', 'email' => 'theo@example.com'],
            ['name' => 'Mila Green', 'email' => 'mila@example.com'],
            ['name' => 'Jonas Lee', 'email' => 'jonas@example.com'],
            ['name' => 'Sofia Patel', 'email' => 'sofia@example.com'],
            ['name' => 'Eli Carter', 'email' => 'eli@example.com'],
        ];

        $customerUsers = collect($customerProfiles)->map(fn (array $profile) => User::updateOrCreate(
            ['email' => $profile['email']],
            [
                'name' => $profile['name'],
                'password' => 'password',
                'is_admin' => false,
                'active_venue_id' => null,
            ],
        ));

        Visit::query()->whereIn('venue_id', $venues->pluck('id'))->delete();
        RewardUnlock::query()
            ->whereHas('reward', fn ($query) => $query->whereIn('venue_id', $venues->pluck('id')))
            ->delete();
        CustomerRewardCycle::query()
            ->whereHas('customer', fn ($query) => $query->whereIn('venue_id', $venues->pluck('id')))
            ->delete();

        $loyalty = app(LoyaltyStampService::class);

        $venues->each(function (Venue $venue, int $venueIndex) use ($customerUsers, $owner, $loyalty): void {
            $customerUsers->each(function (User $user, int $customerIndex) use ($venue, $venueIndex, $owner, $loyalty): void {
                if (($customerIndex + $venueIndex) % 4 === 0 && $user->email !== 'customer@example.com') {
                    return;
                }

                $stamps = $this->demoStampsFor($venue->slug, $user->email, $customerIndex, $venueIndex);

                $customer = Customer::updateOrCreate(
                    [
                        'venue_id' => $venue->id,
                        'user_id' => $user->id,
                    ],
                    [
                        'qr_token' => Customer::query()
                            ->where('venue_id', $venue->id)
                            ->where('user_id', $user->id)
                            ->value('qr_token') ?? (string) Str::uuid(),
                        'stamps' => $stamps,
                    ],
                );

                CustomerRewardCycle::updateOrCreate(
                    [
                        'customer_id' => $customer->id,
                        'cycle_number' => 1,
                    ],
                    [
                        'completed_at' => null,
                    ],
                );

                $visitCount = min($stamps + 1, 9);

                foreach (range(1, $visitCount) as $visitIndex) {
                    // Most recent visit stays in the current month (dashboard KPIs), always in the past.
                    $daysAgo = $visitIndex === $visitCount
                        ? 0
                        : (($visitCount - $visitIndex) * 3) + $customerIndex + $venueIndex;

                    $createdAt = now()->subDays($daysAgo);

                    if ($daysAgo === 0) {
                        $minutesAgo = 30 + (($customerIndex * 41 + $venueIndex * 29 + $visitIndex * 7) % (72 * 60));
                        $createdAt = $createdAt->subMinutes($minutesAgo);
                    } else {
                        $createdAt = $createdAt->setTime(10 + ($visitIndex % 8), 15);
                    }

                    Visit::create([
                        'customer_id' => $customer->id,
                        'venue_id' => $venue->id,
                        'created_by' => $owner->id,
                        'created_at' => $createdAt,
                    ]);
                }

                $loyalty->syncEligibleUnlocks($customer);

                if ($venue->slug === 'demo-cafe' && $user->email === 'customer@example.com') {
                    RewardUnlock::query()
                        ->where('customer_id', $customer->id)
                        ->where('cycle_number', 1)
                        ->whereNull('claimed_at')
                        ->whereHas('reward', fn ($query) => $query
                            ->where('venue_id', $venue->id)
                            ->where('required_stamps', '<=', 5))
                        ->update([
                            'claimed_at' => now()->subDays(2),
                            'claimed_by' => $owner->id,
                        ]);
                }
            });
        });

        Artisan::call('app:backfill-user-stamp-tokens');

        if (filter_var(env('SEED_DEMO_SCALE', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->call(DemoScaleSeeder::class);
        }
    }

    /**
     * Per-venue loyalty cards (one row per user + venue). Demo customer uses realistic
     * progress — not the old 100-stamp shortcut that flooded the rewards wallet.
     */
    private function demoStampsFor(string $venueSlug, string $email, int $customerIndex, int $venueIndex): int
    {
        if ($email === 'customer@example.com') {
            return match ($venueSlug) {
                'demo-cafe' => 7,
                'harbor-coffee' => 4,
                'north-star-burgers' => 6,
                'olive-street-kitchen' => 3,
                default => 5,
            };
        }

        return (($customerIndex * 2) + $venueIndex + 3) % 11;
    }
}
