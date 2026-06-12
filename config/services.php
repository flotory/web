<?php

return [
    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
        'ios_client_id' => env('GOOGLE_IOS_CLIENT_ID'),
        'android_client_id' => env('GOOGLE_ANDROID_CLIENT_ID'),
        // Browser key — Vue Places autocomplete (HTTP referrer restricted).
        'maps_browser_key' => env('VITE_GOOGLE_MAPS_API_KEY', env('GOOGLE_MAPS_BROWSER_API_KEY', env('GOOGLE_MAPS_API_KEY'))),
        // Server key — Laravel Time Zone API (IP-restricted in production).
        'maps_server_key' => env('GOOGLE_MAPS_SERVER_API_KEY', env('GOOGLE_MAPS_API_KEY')),
    ],
];
