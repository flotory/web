<?php

return [
    /** Bump when regenerating icons (`npm run icons:generate`). Keep in sync with resources/js/lib/brand.ts */
    'icon_version' => 'final-f-large-20260608b',

    /** Full Calendly event URL for owner demo bookings, e.g. https://calendly.com/flotoryapp/30min */
    'demo_calendly_url' => env('FLOTORY_DEMO_CALENDLY_URL'),

    /** Public support inbox for contact form and legal pages. */
    'support_email' => env('FLOTORY_SUPPORT_EMAIL', 'flotoryapp@gmail.com'),

    /** Days until an owner dashboard invitation link expires. */
    'owner_invitation_ttl_days' => (int) env('FLOTORY_OWNER_INVITATION_TTL_DAYS', 7),

    /** Minimum supported mobile app versions. Leave null to allow any client build. */
    'min_ios_version' => env('FLOTORY_MIN_IOS_VERSION'),
    'min_android_version' => env('FLOTORY_MIN_ANDROID_VERSION'),

    /** When true, outdated mobile apps below the platform minimum are blocked on launch. */
    'force_update' => filter_var(env('FLOTORY_FORCE_UPDATE', false), FILTER_VALIDATE_BOOL),

    'ios_update_url' => env('FLOTORY_IOS_UPDATE_URL', 'https://flotory.com/app'),
    'android_update_url' => env('FLOTORY_ANDROID_UPDATE_URL', 'https://flotory.com/app'),
];
