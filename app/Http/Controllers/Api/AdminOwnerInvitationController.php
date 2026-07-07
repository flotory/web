<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOwnerInvitationRequest;
use App\Models\OwnerInvitation;
use App\Services\OwnerInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOwnerInvitationController extends Controller
{
    public function __construct(private OwnerInvitationService $invitations) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->toString();

        $invitations = $this->invitations
            ->listForAdmin($search !== '' ? $search : null)
            ->map(fn (OwnerInvitation $invitation): array => $this->present($invitation));

        return response()->json([
            'invitations' => $invitations,
        ]);
    }

    public function store(StoreOwnerInvitationRequest $request): JsonResponse
    {
        $result = $this->invitations->createAndSend(
            $request->string('email')->toString(),
            $request->user(),
            $request->filled('business_name') ? $request->string('business_name')->toString() : null,
        );

        return response()->json([
            'invitation' => $this->present($result['invitation']),
            'register_url' => $result['register_url'],
        ], 201);
    }

    public function destroy(Request $request, int $invitation): JsonResponse
    {
        $record = OwnerInvitation::query()->findOrFail($invitation);

        $this->invitations->revoke($record, $request->user());

        return response()->json([
            'invitation' => $this->present($record->fresh(['brand:id,name,slug,status', 'invitedBy:id,name'])),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(OwnerInvitation $invitation): array
    {
        $stage = $this->invitations->pipelineStage($invitation);

        return [
            'id' => $invitation->id,
            'email' => $invitation->email,
            'business_name' => $invitation->business_name,
            'expires_at' => $invitation->expires_at->toIso8601String(),
            'accepted_at' => $invitation->accepted_at?->toIso8601String(),
            'revoked_at' => $invitation->revoked_at?->toIso8601String(),
            'status' => $invitation->accepted_at !== null
                ? 'accepted'
                : ($invitation->revoked_at !== null
                    ? 'revoked'
                    : ($invitation->isExpired() ? 'expired' : 'pending')),
            'pipeline_stage' => $stage,
            'venue' => $invitation->brand ? [
                'id' => $invitation->venue?->id,
                'name' => $invitation->brand->name,
                'slug' => $invitation->venue?->slug ?? $invitation->brand->slug,
                'status' => $invitation->brand->status,
            ] : null,
            'invited_by' => $invitation->invitedBy ? [
                'id' => $invitation->invitedBy->id,
                'name' => $invitation->invitedBy->name,
            ] : null,
            'register_url' => $invitation->isUsable()
                ? $this->invitations->registerUrlFor($invitation)
                : null,
        ];
    }
}
