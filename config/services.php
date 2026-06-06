<?php

return [
    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
        'maps_key' => env('GOOGLE_MAPS_API_KEY', env('VITE_GOOGLE_MAPS_API_KEY')),
    ],
];
