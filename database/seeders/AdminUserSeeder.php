<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\VenueUser;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) env('ADMIN_EMAIL', 'admin@flotory.com');

        $admin = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => (string) env('ADMIN_NAME', 'Flotory Admin'),
                'password' => (string) env('ADMIN_PASSWORD', 'password'),
                'is_admin' => true,
            ],
        );

        VenueUser::query()->where('user_id', $admin->id)->delete();
        $admin->forceFill(['active_venue_id' => null])->save();
    }
}
