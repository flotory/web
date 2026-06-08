<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GoogleIdTokenVerifier
{
    /**
     * @return array{google_id: string, email: string, name: string, avatar: ?string}|null
     */
    public function verify(string $idToken): ?array
    {
        $idToken = trim($idToken);
        if ($idToken === '') {
            return null;
        }

        $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->ok()) {
            return null;
        }

        /** @var array<string, mixed> $payload */
        $payload = $response->json();
        if (! is_array($payload)) {
            return null;
        }

        $audience = is_string($payload['aud'] ?? null) ? $payload['aud'] : '';
        if (! $this->isAllowedAudience($audience)) {
            return null;
        }

        $email = is_string($payload['email'] ?? null) ? strtolower(trim($payload['email'])) : '';
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        if (! $this->isEmailVerified($payload['email_verified'] ?? null)) {
            return null;
        }

        $googleId = is_string($payload['sub'] ?? null) ? trim($payload['sub']) : '';
        if ($googleId === '') {
            return null;
        }

        $name = is_string($payload['name'] ?? null) ? trim($payload['name']) : '';
        $avatar = is_string($payload['picture'] ?? null) ? trim($payload['picture']) : null;

        return [
            'google_id' => $googleId,
            'email' => $email,
            'name' => $name !== '' ? $name : 'Guest',
            'avatar' => $avatar !== '' ? $avatar : null,
        ];
    }

    private function isAllowedAudience(string $audience): bool
    {
        if ($audience === '') {
            return false;
        }

        $allowed = array_values(array_filter([
            config('services.google.client_id'),
            config('services.google.ios_client_id'),
            config('services.google.android_client_id'),
        ], static fn (mixed $value): bool => is_string($value) && trim($value) !== ''));

        return in_array($audience, $allowed, true);
    }

    private function isEmailVerified(mixed $value): bool
    {
        if ($value === true) {
            return true;
        }

        if (is_string($value)) {
            return strtolower($value) === 'true';
        }

        return false;
    }
}
