<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
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

        $venue = Venue::updateOrCreate(
            ['slug' => 'demo-cafe'],
            [
                'name' => 'Demo Cafe',
                'category' => 'cafe',
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

        $staff = User::updateOrCreate(
            ['email' => 'staff@example.com'],
            [
                'name' => 'Demo Staff',
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

        VenueUser::updateOrCreate(
            [
                'venue_id' => $venue->id,
                'user_id' => $owner->id,
            ],
            [
                'role' => 'owner',
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
    }
}
