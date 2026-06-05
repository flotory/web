<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlatformPaletteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPaletteController extends Controller
{
    public function __construct(private PlatformPaletteService $palette) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'defaults' => $this->palette->defaults(),
            'current' => $this->palette->current(),
            'overrides' => $this->palette->overrides(),
            'tokens' => $this->palette->tokenCatalog(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'palette' => ['required', 'array'],
        ]);

        $current = $this->palette->update($validated['palette']);

        return response()->json([
            'defaults' => $this->palette->defaults(),
            'current' => $current,
            'overrides' => $this->palette->overrides(),
            'tokens' => $this->palette->tokenCatalog(),
        ]);
    }

    public function reset(): JsonResponse
    {
        $current = $this->palette->reset();

        return response()->json([
            'defaults' => $this->palette->defaults(),
            'current' => $current,
            'overrides' => [],
            'tokens' => $this->palette->tokenCatalog(),
        ]);
    }
}
