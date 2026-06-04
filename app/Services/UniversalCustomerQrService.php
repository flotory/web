<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserStampToken;
use App\Support\LoyaltyQr;
use Illuminate\Support\Str;

class UniversalCustomerQrService
{
    public function isEnabled(): bool
    {
        return \App\Support\LoyaltyConfig::universalQrEnabled();
    }

    /**
     * @return array{public_token: string, qr_value: string, version: int}
     */
    public function ensureForUser(User $user): array
    {
        $row = UserStampToken::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'public_token' => (string) Str::uuid(),
                'version' => 1,
            ],
        );

        return $this->present($row);
    }

    /**
     * @return array{public_token: string, qr_value: string, version: int}
     */
    public function presentForUser(User $user): ?array
    {
        $row = $user->stampToken;

        return $row ? $this->present($row) : null;
    }

    public function resolveUser(string $token): ?User
    {
        $normalized = strtolower(trim($token));

        if (! Str::isUuid($normalized)) {
            return null;
        }

        $row = UserStampToken::query()
            ->where('public_token', $normalized)
            ->where(function ($query): void {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        return $row?->user;
    }

    /**
     * @return array{public_token: string, qr_value: string, version: int}
     */
    private function present(UserStampToken $row): array
    {
        return [
            'public_token' => $row->public_token,
            'qr_value' => LoyaltyQr::memberQrPayload($row->public_token),
            'version' => (int) $row->version,
        ];
    }
}
