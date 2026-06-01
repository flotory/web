<?php

namespace App\Support;

use Illuminate\Support\Str;

final class LoyaltyQr
{
    public const REDEEM_PATH_PREFIX = '/r/';

    public static function redeemUrl(string $token, ?string $origin = null): string
    {
        $base = rtrim($origin ?? (string) config('app.url'), '/');

        return "{$base}".self::REDEEM_PATH_PREFIX."{$token}";
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

        if (preg_match('~^https?://[^/]+'.preg_quote(self::REDEEM_PATH_PREFIX, '~').'([0-9a-fA-F-]{36})$~', $value, $matches) === 1) {
            return ['type' => 'redeem', 'token' => strtolower($matches[1])];
        }

        if (preg_match('~^flotory:redeem:([0-9a-fA-F-]{36})$~', $value, $matches) === 1) {
            return ['type' => 'redeem', 'token' => strtolower($matches[1])];
        }

        if (str_starts_with($value, self::REDEEM_PATH_PREFIX)) {
            $token = substr($value, strlen(self::REDEEM_PATH_PREFIX));

            if (Str::isUuid($token)) {
                return ['type' => 'redeem', 'token' => strtolower($token)];
            }
        }

        if (Str::isUuid($value)) {
            return ['type' => 'stamp', 'token' => strtolower($value)];
        }

        return null;
    }
}
