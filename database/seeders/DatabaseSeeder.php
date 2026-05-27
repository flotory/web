<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Reward;
use App\Models\RewardRedemption;
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
                'role' => UserRole::Customer,
            ],
        );

        $venues = collect([
            ['name' => 'Demo Cafe', 'slug' => 'demo-cafe'],
            ['name' => 'Harbor Coffee', 'slug' => 'harbor-coffee'],
            ['name' => 'North Star Burgers', 'slug' => 'north-star-burgers'],
            ['name' => 'Olive Street Kitchen', 'slug' => 'olive-street-kitchen'],
        ])->map(fn (array $data) => Venue::updateOrCreate(
            ['slug' => $data['slug']],
            [
                'owner_user_id' => $owner->id,
                'name' => $data['name'],
            ],
        ));

        $venue = $venues->first();

        $owner->forceFill(['active_venue_id' => $venue->id])->save();

        $staff = User::updateOrCreate(
            ['email' => 'staff@example.com'],
            [
                'name' => 'Demo Staff',
                'password' => 'password',
                'role' => UserRole::Customer,
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
                'reward_type' => 'discount',
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
                'reward_type' => 'free_item',
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
                'role' => UserRole::Customer,
                'active_venue_id' => null,
            ],
        ));

        Visit::query()->whereIn('venue_id', $venues->pluck('id'))->delete();
        RewardRedemption::query()
            ->whereHas('reward', fn ($query) => $query->whereIn('venue_id', $venues->pluck('id')))
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
            });

            $reward = $venue->rewards()->where('required_stamps', 5)->first();
            $redeemedCustomer = $venue->customers()->orderByDesc('stamps')->first();

            if ($reward && $redeemedCustomer) {
                RewardRedemption::create([
                    'customer_id' => $redeemedCustomer->id,
                    'reward_id' => $reward->id,
                    'redeemed_by' => $owner->id,
                    'redeemed_at' => now()->subDays(2 + $venueIndex),
                ]);
            }
        });
    }
}
