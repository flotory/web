<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AppleOAuthUserService
{
    /**
     * @param  array{apple_id: string, email: ?string, name: string}  $profile
     */
    public function findOrCreate(array $profile): User
    {
        $user = User::query()->firstWhere('apple_id', $profile['apple_id']);

        if ($user) {
            if ($profile['email'] !== null && $user->email !== $profile['email']) {
                $user->forceFill(['email' => $profile['email']])->save();
            }

            return $user;
        }

        if ($profile['email'] !== null) {
            $user = User::query()->firstWhere('email', $profile['email']);

            if ($user) {
                $user->forceFill(['apple_id' => $profile['apple_id']])->save();

                return $user;
            }
        }

        $email = $profile['email'] ?? $this->privateRelayEmail($profile['apple_id']);

        return User::query()->create([
            'name' => $profile['name'],
            'email' => $email,
            'password' => Hash::make(Str::password(32)),
            'is_admin' => false,
            'apple_id' => $profile['apple_id'],
        ]);
    }

    private function privateRelayEmail(string $appleId): string
    {
        return 'apple_'.$appleId.'@privaterelay.flotory.local';
    }
}
