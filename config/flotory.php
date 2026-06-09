<?php

return [
    /** Bump when regenerating icons (`npm run icons:generate`). Keep in sync with resources/js/lib/brand.ts */
    'icon_version' => 'final-f-large-20260608b',

    /** Full Calendly event URL for owner demo bookings, e.g. https://calendly.com/your-name/flotory-demo */
    'demo_calendly_url' => env('FLOTORY_DEMO_CALENDLY_URL'),

    /** Inbox for demo lead notifications. Defaults to MAIL_FROM_ADDRESS when unset. */
    'demo_notify_email' => env('FLOTORY_DEMO_NOTIFY_EMAIL'),
];
