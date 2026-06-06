<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PublicAppConfigController extends Controller
{
    public function show(): JsonResponse
    {
        $mapsKey = config('services.google.maps_key');
        $normalizedKey = is_string($mapsKey) ? trim($mapsKey) : '';

        return response()->json([
            'google_maps_key' => $normalizedKey !== '' ? $normalizedKey : null,
        ]);
    }
}
