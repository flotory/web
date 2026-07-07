<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptOwnerInvitationRequest;
use App\Models\OwnerInvitation;
use App\Services\OwnerInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class PublicOwnerInvitationController extends Controller
{
    public function __construct(private OwnerInvitationService $invitations) {}

    public function show(string $token): JsonResponse
    {
        $invitation = OwnerInvitation::query()
            ->with(['brand:id,name,slug,status', 'venue:id,brand_id,name,slug'])
            ->where('token', $token)
            ->first();

        if (! $invitation instanceof OwnerInvitation) {
            return response()->json([
                'valid' => false,
                'reason' => 'not_found',
            ], 404);
        }

        if ($invitation->accepted_at !== null) {
            return response()->json([
                'valid' => false,
                'reason' => 'accepted',
            ]);
        }

        if ($invitation->revoked_at !== null) {
            return response()->json([
                'valid' => false,
                'reason' => 'revoked',
            ]);
        }

        if ($invitation->isExpired()) {
            return response()->json([
                'valid' => false,
                'reason' => 'expired',
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ]);
        }

        return response()->json([
            'valid' => true,
            'email' => $invitation->email,
            'business_name' => $invitation->business_name,
            'expires_at' => $invitation->expires_at->toIso8601String(),
            'venue' => $invitation->brand ? [
                'id' => $invitation->venue?->id,
                'name' => $invitation->brand->name,
                'slug' => $invitation->venue?->slug ?? $invitation->brand->slug,
            ] : null,
        ]);
    }

    public function accept(AcceptOwnerInvitationRequest $request, string $token): JsonResponse
    {
        $invitation = $this->invitations->findUsableByToken($token);

        if (! $invitation instanceof OwnerInvitation) {
            throw ValidationException::withMessages([
                'invite' => 'This invitation is invalid or has expired.',
            ]);
        }

        $result = $this->invitations->accept(
            $invitation,
            $request->string('name')->toString(),
            $request->string('password')->toString(),
        );

        return response()->json([
            'user' => $result['user'],
            'token' => $result['token'],
        ], 201);
    }
}
