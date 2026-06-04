<?php

namespace App\Support;

use Illuminate\Support\Str;

final class LoyaltyQr
{
    public const REDEEM_PATH_PREFIX = '/r/';

    public const MEMBER_PREFIX = 'flotory:member:';

    /** Universal customer stamp QR (v2) — one token per user. */
    public static function memberQrPayload(string $token): string
    {
        return self::MEMBER_PREFIX.strtolower($token);
    }

    /** Compact payload for QR codes — avoids confusion with stamp-card UUIDs. */
    public static function redeemQrPayload(string $token): string
    {
        return 'flotory:redeem:'.strtolower($token);
    }

    public static function redeemUrl(string $token, ?string $origin = null): string
    {
        $base = rtrim($origin ?? (string) config('app.url'), '/');

        return "{$base}".self::REDEEM_PATH_PREFIX.strtolower($token);
    }

    /**
     * @return array{type: 'stamp', token: string}|array{type: 'redeem', token: string}|null
     */
    public static function parse(string $raw): ?array
    {
        $value = trim($raw);

        if ($value === '') {
            return null;
        }

        if (preg_match('~flotory:redeem:([0-9a-fA-F-]{36})~', $value, $matches) === 1) {
            return ['type' => 'redeem', 'token' => strtolower($matches[1])];
        }

        if (preg_match('~'.preg_quote(self::MEMBER_PREFIX, '~').'([0-9a-fA-F-]{36})~', $value, $matches) === 1) {
            return ['type' => 'stamp', 'token' => strtolower($matches[1])];
        }

        if (preg_match('~'.preg_quote(self::REDEEM_PATH_PREFIX, '~').'([0-9a-fA-F-]{36})~', $value, $matches) === 1) {
            return ['type' => 'redeem', 'token' => strtolower($matches[1])];
        }

        if (Str::isUuid($value)) {
            return ['type' => 'stamp', 'token' => strtolower($value)];
        }

        return null;
    }
}
