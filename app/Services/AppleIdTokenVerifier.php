<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class AppleIdTokenVerifier
{
    /**
     * @return array{apple_id: string, email: ?string, name: string}|null
     */
    public function verify(string $idToken): ?array
    {
        $idToken = trim($idToken);
        if ($idToken === '') {
            return null;
        }

        try {
            $decoded = JWT::decode($idToken, JWK::parseKeySet($this->publicKeys()));
        } catch (\Throwable) {
            return null;
        }

        $audience = config('services.apple.client_id');
        if (! is_string($audience) || $audience === '' || ($decoded->aud ?? null) !== $audience) {
            return null;
        }

        if (($decoded->iss ?? null) !== 'https://appleid.apple.com') {
            return null;
        }

        $appleId = is_string($decoded->sub ?? null) ? trim($decoded->sub) : '';
        if ($appleId === '') {
            return null;
        }

        $email = is_string($decoded->email ?? null) ? strtolower(trim($decoded->email)) : null;
        if ($email !== null && $email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = null;
        }

        return [
            'apple_id' => $appleId,
            'email' => $email !== '' ? $email : null,
            'name' => 'Guest',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function publicKeys(): array
    {
        /** @var array<string, mixed> $keys */
        $keys = Cache::remember('apple_sign_in_jwks', now()->addHours(12), function (): array {
            $response = Http::timeout(10)->get('https://appleid.apple.com/auth/keys');
            if (! $response->ok()) {
                throw new \RuntimeException('Unable to load Apple public keys.');
            }

            /** @var array<string, mixed> $payload */
            $payload = $response->json();
            if (! is_array($payload)) {
                throw new \RuntimeException('Invalid Apple JWKS payload.');
            }

            return $payload;
        });

        return $keys;
    }
}
