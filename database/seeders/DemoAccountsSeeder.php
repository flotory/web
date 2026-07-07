<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Seeder;

/**
 * Idempotent demo login accounts for local development.
 * Safe to run on every Docker boot — resets passwords to the known demo value.
 */
class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AdminUserSeeder::class);

        $brand = Brand::updateOrCreate(
            ['slug' => 'demo-cafe'],
            [
                'name' => 'Demo Cafe',
                'category' => 'cafe',
                'status' => Brand::STATUS_PUBLISHED,
                'published_at' => now(),
            ],
        );

        $venue = Venue::updateOrCreate(
            ['slug' => 'demo-cafe'],
            [
                'brand_id' => $brand->id,
                'is_primary' => true,
                'name' => 'Demo Cafe',
                'address' => '12 Market Street, Toruń',
            ],
        );

        $owner = User::updateOrCreate(
            ['email' => 'owner@example.com'],
            [
                'name' => 'Demo Owner',
                'password' => 'password',
                'is_admin' => false,
                'active_venue_id' => $venue->id,
            ],
        );

        User::updateOrCreate(
            ['email' => 'customer@example.com'],
            [
                'name' => 'Demo Customer',
                'password' => 'password',
                'is_admin' => false,
                'active_venue_id' => null,
            ],
        );

        BrandUser::updateOrCreate(
            [
                'brand_id' => $brand->id,
                'user_id' => $owner->id,
            ],
            [
                'role' => 'owner',
            ],
        );
    }
}
