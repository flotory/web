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
        $resolvedName = $this->resolveDisplayName($profile);

        $user = User::query()->firstWhere('apple_id', $profile['apple_id']);

        if ($user) {
            $updates = [];

            if ($profile['email'] !== null && $user->email !== $profile['email']) {
                $updates['email'] = $profile['email'];
            }

            if ($this->shouldUpgradeName($user->name, $resolvedName)) {
                $updates['name'] = $resolvedName;
            }

            if ($updates !== []) {
                $user->forceFill($updates)->save();
            }

            return $user;
        }

        if ($profile['email'] !== null) {
            $user = User::query()->firstWhere('email', $profile['email']);

            if ($user) {
                $updates = ['apple_id' => $profile['apple_id']];

                if ($this->shouldUpgradeName($user->name, $resolvedName)) {
                    $updates['name'] = $resolvedName;
                }

                $user->forceFill($updates)->save();

                return $user;
            }
        }

        $email = $profile['email'] ?? $this->privateRelayEmail($profile['apple_id']);

        return User::query()->create([
            'name' => $resolvedName,
            'email' => $email,
            'password' => Hash::make(Str::password(32)),
            'is_admin' => false,
            'apple_id' => $profile['apple_id'],
        ]);
    }

    /**
     * @param  array{apple_id: string, email: ?string, name: string}  $profile
     */
    private function resolveDisplayName(array $profile): string
    {
        $name = trim($profile['name'] ?? '');
        if ($name !== '' && ! $this->isPlaceholderName($name)) {
            return $name;
        }

        $email = $profile['email'] ?? null;
        if (is_string($email) && $email !== '' && ! str_ends_with($email, '@privaterelay.flotory.local')) {
            $local = explode('@', $email)[0] ?? '';
            $humanized = $this->humanizeEmailLocal($local);
            if ($humanized !== null) {
                return $humanized;
            }
        }

        return 'Apple Account';
    }

    private function shouldUpgradeName(string $current, string $resolved): bool
    {
        if ($resolved === '' || $this->isPlaceholderName($resolved)) {
            return false;
        }

        return $this->isPlaceholderName($current);
    }

    private function isPlaceholderName(string $name): bool
    {
        return in_array(strtolower(trim($name)), ['guest', 'apple user', 'apple account'], true);
    }

    private function humanizeEmailLocal(string $local): ?string
    {
        $local = trim($local);
        if ($local === '') {
            return null;
        }

        $parts = preg_split('/[._-]+/', $local) ?: [];
        $words = array_values(array_filter(array_map(
            static fn (string $word): string => Str::title(strtolower($word)),
            array_filter($parts, static fn (string $word): bool => $word !== ''),
        )));

        return $words === [] ? null : implode(' ', $words);
    }

    private function privateRelayEmail(string $appleId): string
    {
        return 'apple_'.$appleId.'@privaterelay.flotory.local';
    }
}
