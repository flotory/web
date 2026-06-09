<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PublicDemoBookingController extends Controller
{
    public function show(): JsonResponse
    {
        $url = config('flotory.demo_calendly_url');
        $normalizedUrl = is_string($url) ? trim($url) : '';

        return response()->json([
            'calendly_url' => $normalizedUrl !== '' ? $normalizedUrl : null,
        ]);
    }
}
