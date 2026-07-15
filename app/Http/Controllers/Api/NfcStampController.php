<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NfcStampService;
use App\Services\TapLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NfcStampController extends Controller
{
    public function show(string $token, NfcStampService $nfc): JsonResponse
    {
        $tag = $nfc->resolveActiveTag($token);
        $tag->loadMissing('venue');

        return response()->json($nfc->presentTag($tag));
    }

    public function stamp(Request $request, string $token, NfcStampService $nfc): JsonResponse
    {
        // Optional at the edge so old clients get the S9 presence error from the
        // service rather than a validation error about a field they never sent.
        $validated = $request->validate([
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'accuracy' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $tag = $nfc->resolveActiveTag($token);

        $payload = $nfc->awardStampFromTap(
            $request->user(),
            $tag,
            TapLocation::fromRequestPayload($validated),
        );

        return response()->json($nfc->presentStampResult($payload), 201);
    }
}
