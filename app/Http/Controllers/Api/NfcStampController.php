<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NfcStampService;
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
        $tag = $nfc->resolveActiveTag($token);

        $payload = $nfc->awardStampFromTap($request->user(), $tag);

        return response()->json($nfc->presentStampResult($payload), 201);
    }
}
