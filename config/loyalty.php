<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Minimum seconds between stamp awards on the same loyalty card
    |--------------------------------------------------------------------------
    */

    'stamp_cooldown_seconds' => (int) env('LOYALTY_STAMP_COOLDOWN_SECONDS', 3),

    /*
    |--------------------------------------------------------------------------
    | NFC tap stamping
    |--------------------------------------------------------------------------
    */

    'nfc' => [
        'debounce_seconds' => (int) env('LOYALTY_NFC_DEBOUNCE_SECONDS', 3),
        'max_stamps_per_window' => (int) env('LOYALTY_NFC_MAX_STAMPS_PER_WINDOW', 10),
        'window_seconds' => (int) env('LOYALTY_NFC_WINDOW_SECONDS', 120),
    ],

];
