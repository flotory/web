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

        return response()->json([
            'google_maps_key' => $normalizedKey !== '' ? $normalizedKey : null,
            'google_oauth_client_id' => $normalizedClientId !== '' ? $normalizedClientId : null,
        ]);
    }
}
