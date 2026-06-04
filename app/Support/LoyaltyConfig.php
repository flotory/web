<?php

namespace App\Support;

use Carbon\Carbon;

final class LoyaltyConfig
{
    public static function universalQrEnabled(): bool
    {
        return (bool) config('loyalty.universal_qr_enabled', false);
    }

    public static function legacyCardQrEnabled(): bool
    {
        if (! (bool) config('loyalty.legacy_card_qr_enabled', false)) {
            return false;
        }

        $sunset = config('loyalty.legacy_card_qr_sunset_at');

        if (! is_string($sunset) || trim($sunset) === '') {
            return true;
        }

        try {
            return ! now()->greaterThan(Carbon::parse($sunset));
        } catch (\Throwable) {
            return true;
        }
    }
}
