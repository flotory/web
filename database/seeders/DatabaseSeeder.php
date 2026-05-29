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
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::updateOrCreate(
            ['email' => 'owner@example.com'],
            [
                'name' => 'Demo Owner',
                'password' => 'password',
                'is_admin' => false,
            ],
        );

        $venues = collect([
            ['name' => 'Demo Cafe', 'slug' => 'demo-cafe', 'category' => 'cafe'],
            ['name' => 'Harbor Coffee', 'slug' => 'harbor-coffee', 'category' => 'cafe'],
            ['name' => 'North Star Burgers', 'slug' => 'north-star-burgers', 'category' => 'restaurant'],
            ['name' => 'Olive Street Kitchen', 'slug' => 'olive-street-kitchen', 'category' => 'restaurant'],
        ])->map(fn (array $data) => Venue::updateOrCreate(
            ['slug' => $data['slug']],
            [
                'name' => $data['name'],
                'category' => $data['category'],
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

            Reward::updateOrCreate([
                'venue_id' => $venue->id,
                'required_stamps' => 5,
            ], [
                'title' => match ($venue->slug) {
                    'north-star-burgers' => '50% off burger',
                    'olive-street-kitchen' => 'Free dessert',
                    default => 'Free coffee upgrade',
                },
                'description' => 'First milestone reward to kick off customer momentum.',
                'reward_type' => 'milestone',
                'sort_order' => 5,
                'active' => true,
            ]);

            Reward::updateOrCreate([
                'venue_id' => $venue->id,
                'required_stamps' => 10,
            ], [
                'title' => match ($venue->slug) {
                    'north-star-burgers' => 'Free fries',
                    'olive-street-kitchen' => 'Free lunch bowl',
                    default => 'Free coffee',
                },
                'description' => 'Stronger reward after sustained repeat visits.',
                'reward_type' => 'milestone',
                'sort_order' => 10,
                'active' => true,
            ]);
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

        $venues->each(function (Venue $venue, int $venueIndex) use ($customerUsers, $owner): void {
            $customerUsers->each(function (User $user, int $customerIndex) use ($venue, $venueIndex, $owner): void {
                if (($customerIndex + $venueIndex) % 4 === 0 && $user->email !== 'customer@example.com') {
                    return;
                }

                $stamps = $venue->slug === 'demo-cafe' && $user->email === 'customer@example.com'
                    ? 100
                    : (($customerIndex * 2) + $venueIndex + 3) % 11;

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
                    Visit::create([
                        'customer_id' => $customer->id,
                        'venue_id' => $venue->id,
                        'created_by' => $owner->id,
                        'created_at' => now()
                            ->subDays(($visitIndex * 3) + $customerIndex + $venueIndex)
                            ->setTime(10 + ($visitIndex % 8), 15),
                    ]);
                }

                $venue->rewards()
                    ->where('active', true)
                    ->where('required_stamps', '<=', $stamps)
                    ->each(function (Reward $reward) use ($customer, $owner, $venueIndex): void {
                        $unlock = RewardUnlock::updateOrCreate(
                            [
                                'customer_id' => $customer->id,
                                'reward_id' => $reward->id,
                                'cycle_number' => 1,
                            ],
                            [
                                'unlocked_at' => now()->subDays(3),
                            ],
                        );

                        if ($reward->required_stamps === 5 && $customer->stamps >= 5) {
                            $unlock->forceFill([
                                'claimed_at' => now()->subDays(2 + $venueIndex),
                                'claimed_by' => $owner->id,
                            ])->save();
                        }
                    });
            });
        });
    }
}
