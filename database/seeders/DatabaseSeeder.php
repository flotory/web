<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\Campaign;
use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\NfcTag;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
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

        $brand = Brand::updateOrCreate(
            ['slug' => 'demo-cafe'],
            [
                'name' => 'Demo Cafe',
                'category' => 'cafe',
                'status' => Brand::STATUS_PUBLISHED,
                'published_at' => now(),
                'submitted_at' => null,
                'review_note' => null,
                'average_check_amount' => 1600.00,
            ],
        );

        $venue = Venue::updateOrCreate(
            ['slug' => 'demo-cafe'],
            [
                'brand_id' => $brand->id,
                'is_primary' => true,
                'name' => 'Demo Cafe',
                'address' => '12 Market Street, Toruń',
                'latitude' => 53.0105300,
                'longitude' => 18.6108600,
            ],
        );

        $owner->forceFill(['active_venue_id' => $venue->id])->save();

        BrandUser::updateOrCreate([
            'brand_id' => $brand->id,
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
                'brand_id' => $brand->id,
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
            ->where('brand_id', $brand->id)
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

        $legacyBrandIds = Brand::query()
            ->whereIn('slug', self::LEGACY_VENUE_SLUGS)
            ->pluck('id');

        if ($legacyVenueIds->isNotEmpty() || $legacyBrandIds->isNotEmpty()) {
            $legacyCustomerIds = Customer::query()
                ->whereIn('brand_id', $legacyBrandIds)
                ->pluck('id');

            Visit::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            RewardUnlock::query()->whereIn('customer_id', $legacyCustomerIds)->delete();
            CustomerRewardCycle::query()->whereIn('customer_id', $legacyCustomerIds)->delete();
            Customer::query()->whereIn('brand_id', $legacyBrandIds)->delete();
            Reward::query()->whereIn('brand_id', $legacyBrandIds)->delete();
            Campaign::query()->whereIn('brand_id', $legacyBrandIds)->delete();
            NfcTag::query()->whereIn('venue_id', $legacyVenueIds)->delete();
            BrandUser::query()->whereIn('brand_id', $legacyBrandIds)->delete();
            Venue::query()->whereIn('id', $legacyVenueIds)->delete();
            Brand::query()->whereIn('id', $legacyBrandIds)->delete();
        }

        User::query()
            ->whereIn('email', self::LEGACY_CUSTOMER_EMAILS)
            ->delete();
    }
}
