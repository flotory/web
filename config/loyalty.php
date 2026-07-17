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

        // Presence-independent ceiling (BUSINESS_RULES S6, Z10): at most 3 stamps
        // per user per venue per hour. "One stamp = one visit" means a real
        // customer never needs more; anything above is farming. This is the
        // damage-control cap that works even while the geofence is in monitor
        // mode — it does not prove presence, it just makes replay slow.
        'max_stamps_per_window' => (int) env('LOYALTY_NFC_MAX_STAMPS_PER_WINDOW', 3),
        'window_seconds' => (int) env('LOYALTY_NFC_WINDOW_SECONDS', 3600),

        /*
        |----------------------------------------------------------------------
        | Presence geofence (BUSINESS_RULES S9–S11, Z9)
        |----------------------------------------------------------------------
        |
        | A tag token is public, so presence must be established separately.
        | The client sends its coordinates and the server checks the distance
        | to the stand's venue.
        |
        | enforce=false is MONITOR MODE: out-of-range and coordinate-less taps
        | are logged but still awarded. Ship the app that sends coordinates,
        | watch nfc.geofence.* logs until old clients drain, then set
        | LOYALTY_NFC_GEOFENCE_ENFORCE=true. While enforce=false the geofence
        | provides NO protection — an attacker simply omits the coordinates.
        |
        */
        'geofence' => [
            'enforce' => (bool) env('LOYALTY_NFC_GEOFENCE_ENFORCE', false),
            'radius_meters' => (int) env('LOYALTY_NFC_GEOFENCE_RADIUS_METERS', 200),

            // Added to the radius to absorb poor indoor GPS, capped so a
            // client cannot claim absurd accuracy to widen the fence itself.
            'accuracy_allowance_max_meters' => (int) env('LOYALTY_NFC_GEOFENCE_ACCURACY_ALLOWANCE_METERS', 100),
        ],
    ],

];
