<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Universal customer stamp QR (Flotory v2)
    |--------------------------------------------------------------------------
    |
    | When true, stamp scans resolve a user-level token (user_stamp_tokens) and
    | award stamps to the scanner venue's loyalty card (auto-join on first scan).
    | Legacy per-card customers.qr_token remains supported as fallback.
    |
    */

    'universal_qr_enabled' => (bool) env('LOYALTY_UNIVERSAL_QR', true),

    /*
    |--------------------------------------------------------------------------
    | Legacy per-card stamp QR (customers.qr_token)
    |--------------------------------------------------------------------------
    |
    | Phase 3 default: false — stamp scans must use user_stamp_tokens (My QR).
    | Set true temporarily for rollback; optional sunset disables legacy after a date.
    |
    */

    'legacy_card_qr_enabled' => (bool) env('LOYALTY_LEGACY_CARD_QR', false),

    'legacy_card_qr_sunset_at' => env('LOYALTY_LEGACY_CARD_QR_SUNSET_AT'),

    /*
    |--------------------------------------------------------------------------
    | Minimum seconds between stamp awards on the same loyalty card
    |--------------------------------------------------------------------------
    */

    'stamp_cooldown_seconds' => (int) env('LOYALTY_STAMP_COOLDOWN_SECONDS', 2),

    /*
    |--------------------------------------------------------------------------
    | NFC tap stamping
    |--------------------------------------------------------------------------
    */

    'nfc' => [
        'debounce_seconds' => (int) env('LOYALTY_NFC_DEBOUNCE_SECONDS', 2),
        'max_stamps_per_window' => (int) env('LOYALTY_NFC_MAX_STAMPS_PER_WINDOW', 10),
        'window_seconds' => (int) env('LOYALTY_NFC_WINDOW_SECONDS', 120),
    ],

];
