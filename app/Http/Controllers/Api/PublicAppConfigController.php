<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PublicAppConfigController extends Controller
{
    public function show(): JsonResponse
    {
        $mapsKey = config('services.google.maps_browser_key');
        $normalizedKey = is_string($mapsKey) ? trim($mapsKey) : '';

        $clientId = config('services.google.client_id');
        $normalizedClientId = is_string($clientId) ? trim($clientId) : '';

        $minIos = config('flotory.min_ios_version');
        $minAndroid = config('flotory.min_android_version');

        return response()->json([
            'google_maps_key' => $normalizedKey !== '' ? $normalizedKey : null,
            'google_oauth_client_id' => $normalizedClientId !== '' ? $normalizedClientId : null,
            'min_ios_version' => is_string($minIos) && trim($minIos) !== '' ? trim($minIos) : null,
            'min_android_version' => is_string($minAndroid) && trim($minAndroid) !== '' ? trim($minAndroid) : null,
            'force_update' => (bool) config('flotory.force_update', false),
            'ios_update_url' => config('flotory.ios_update_url'),
            'android_update_url' => config('flotory.android_update_url'),
        ]);
    }
}
