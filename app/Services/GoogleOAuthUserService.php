<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GoogleOAuthUserService
{
    /**
     * @param  array{google_id: string, email: string, name: string, avatar: ?string}  $profile
     */
    public function findOrCreate(array $profile): User
    {
        $user = User::query()->firstWhere('email', $profile['email']);

        if (! $user) {
            return User::query()->create([
                'name' => $profile['name'],
                'email' => $profile['email'],
                'password' => Hash::make(Str::password(32)),
                'is_admin' => false,
                'google_id' => $profile['google_id'],
                'google_avatar' => $profile['avatar'],
            ]);
        }

        $user->forceFill([
            'google_id' => $profile['google_id'],
            'google_avatar' => $profile['avatar'],
        ])->save();

        return $user;
    }
}
