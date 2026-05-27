<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BroadcastAuthController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'socket_id' => ['required', 'string'],
            'channel_name' => ['required', 'string'],
        ]);

        $customerId = $this->customerIdFromChannel($validated['channel_name']);

        $canAccess = Customer::query()
            ->whereKey($customerId)
            ->where('user_id', $request->user()->id)
            ->exists();

        if (! $canAccess) {
            throw ValidationException::withMessages([
                'channel_name' => 'You are not allowed to listen to this loyalty card.',
            ]);
        }

        $signature = hash_hmac(
            'sha256',
            "{$validated['socket_id']}:{$validated['channel_name']}",
            config('broadcasting.connections.reverb.secret') ?: 'loyalty-local-secret',
        );

        return response()->json([
            'auth' => (config('broadcasting.connections.reverb.key') ?: 'loyalty-local-key').":{$signature}",
        ]);
    }

    private function customerIdFromChannel(string $channel): int
    {
        if (! preg_match('/^private-customer\.(\d+)$/', $channel, $matches)) {
            throw ValidationException::withMessages([
                'channel_name' => 'Unsupported realtime channel.',
            ]);
        }

        return (int) $matches[1];
    }
}
