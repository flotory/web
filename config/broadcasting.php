<?php

return [
    'default' => env('BROADCAST_CONNECTION', 'null'),

    'connections' => [
        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY', 'flotory-local-key'),
            'secret' => env('REVERB_APP_SECRET', 'flotory-local-secret'),
            'app_id' => env('REVERB_APP_ID', 'flotory-local-app'),
            'options' => [
                'host' => env('REVERB_BROADCAST_HOST', env('REVERB_HOST', '127.0.0.1')),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
            ],
            'client_options' => [],
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],
    ],
];
