<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlatformPaletteService;
use Illuminate\Http\JsonResponse;

class PublicPaletteController extends Controller
{
    public function __construct(private PlatformPaletteService $palette) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'palette' => $this->palette->current(),
        ]);
    }
}
