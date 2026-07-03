<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\NfcTag;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Models\Visit;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Stable token for Demo Cafe NFC stand (Maestro + local tap URL tests). */
    public const DEMO_CAFE_NFC_TOKEN = 'democafenfcstandlocaltest00001';

    /** @var list<string> */
    private const LEGACY_VENUE_SLUGS = [
        'harbor-coffee',
        'north-star-burgers',
        'olive-street-kitchen',
    ];

    /** @var list<string> */
    private const LEGACY_CUSTOMER_EMAILS = [
        'maya@example.com',
        'alex@example.com',
        'sam@example.com',
        'nora@example.com',
        'leo@example.com',
        'amara@example.com',
        'theo@example.com',
        'mila@example.com',
        'jonas@example.com',
        'sofia@example.com',
        'eli@example.com',
    ];

    public function run(): void
    {
        $this->call(AdminUserSeeder::class);
        $this->purgeLegacyDemoData();

        $owner = User::updateOrCreate(
            ['email' => 'owner@example.com'],
            [
                'name' => 'Demo Owner',
                'password' => 'password',
                'is_admin' => false,
            ],
        );

        $venue = Venue::updateOrCreate(
            ['slug' => 'demo-cafe'],
            [
                'name' => 'Demo Cafe',
                'category' => 'cafe',
                'address' => '12 Market Street, Toruń',
                'latitude' => 53.0105300,
                'longitude' => 18.6108600,
                'status' => Venue::STATUS_PUBLISHED,
                'published_at' => now(),
                'submitted_at' => null,
                'review_note' => null,
                'average_check_amount' => 1600.00,
            ],
        );

        $owner->forceFill(['active_venue_id' => $venue->id])->save();

        VenueUser::updateOrCreate([
            'venue_id' => $venue->id,
            'user_id' => $owner->id,
        ], [
            'role' => 'owner',
        ]);

        foreach ([
            [5, '50% off ice cream', 'Half price on any ice cream after your fifth stamp.', '/images/defaults/rewards/ice-cream-cone.png'],
            [10, 'Free coffee', 'A complimentary coffee on the house.', '/images/defaults/rewards/free-coffee.png'],
            [15, 'Free piece of cake', 'A complimentary slice of cake for loyal regulars.', '/images/defaults/rewards/chocolate-cake.png'],
        ] as [$stamps, $title, $description, $image]) {
            Reward::updateOrCreate([
                'venue_id' => $venue->id,
                'required_stamps' => $stamps,
            ], [
                'title' => $title,
                'description' => $description,
                'image' => $image,
                'image_thumb' => null,
                'reward_type' => 'milestone',
                'sort_order' => $stamps,
                'active' => true,
            ]);
        }

        Reward::query()
            ->where('venue_id', $venue->id)
            ->whereNotIn('required_stamps', [5, 10, 15])
            ->delete();

        NfcTag::updateOrCreate(
            [
                'venue_id' => $venue->id,
                'label' => 'Counter stand',
            ],
            [
                'token' => self::DEMO_CAFE_NFC_TOKEN,
                'active' => true,
            ],
        );

        $this->call(DemoCampaignsSeeder::class);
        $this->call(DemoShowcaseSeeder::class);

        if (filter_var(env('SEED_DEMO_SCALE', false), FILTER_VALIDATE_BOOLEAN)) {
            $this->call(DemoScaleSeeder::class);
        }
    }

    private function purgeLegacyDemoData(): void
    {
        $legacyVenueIds = Venue::query()
            ->whereIn('slug', self::LEGACY_VENUE_SLUGS)
            ->pluck('id');

        if ($legacyVenueIds->isNotEmpty()) {
            $legacyCustomerIds = Customer::query()
                ->whereIn('venue_id', $legacyVenueIds)
                ->pluck('id');

            Visit::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            RewardUnlock::query()->whereIn('customer_id', $legacyCustomerIds)->delete();
            CustomerRewardCycle::query()->whereIn('customer_id', $legacyCustomerIds)->delete();
            Customer::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            Reward::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            Campaign::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            NfcTag::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            VenueUser::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            Venue::query()->whereIn('id', $legacyVenueIds)->delete();
        }

        User::query()
            ->whereIn('email', self::LEGACY_CUSTOMER_EMAILS)
            ->delete();
    }
}
