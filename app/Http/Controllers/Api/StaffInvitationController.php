<?php

namespace App\Http\Controllers\Api;

use App\Enums\VenueStaffInvitationStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VenueStaffInvitation;
use App\Services\VenueStaffInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class StaffInvitationController extends Controller
{
    public function show(string $token, VenueStaffInvitationService $invitations): JsonResponse
    {
        $invitation = VenueStaffInvitation::query()
            ->where('token', $token)
            ->with(['venue:id,name,slug', 'inviter:id,name'])
            ->first();

        if (! $invitation) {
            return response()->json([
                'valid' => false,
                'message' => 'This invitation link is invalid.',
            ], 404);
        }

        $invitations->syncExpiry($invitation);

        $venue = $invitation->venue()->withTrashed()->first();
        $venueClosed = ! $venue || $venue->trashed();

        $valid = $invitation->isUsable() && ! $venueClosed;
        $message = null;

        if ($venueClosed) {
            $message = 'This venue is no longer accepting team invitations.';
        } elseif (! $valid) {
            $message = match ($invitation->status) {
                VenueStaffInvitationStatus::Accepted => 'This invitation has already been accepted.',
                VenueStaffInvitationStatus::Cancelled => 'This invitation was cancelled.',
                VenueStaffInvitationStatus::Expired => 'This invitation has expired. Ask the venue owner to resend it.',
                VenueStaffInvitationStatus::Pending => 'This invitation is no longer valid.',
            };
        }

        $user = auth('sanctum')->user();
        $accountExists = User::query()
            ->where('email', $invitation->email)
            ->exists();

        return response()->json([
            'invitation' => $this->invitationPayload($invitation, $venue),
            'valid' => $valid,
            'message' => $message,
            'account_exists' => $accountExists,
            'authenticated' => (bool) $user,
            'email_matches' => $user
                ? Str::lower($user->email) === Str::lower($invitation->email)
                : null,
        ]);
    }

    public function register(Request $request, string $token, VenueStaffInvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->findUsableByToken($token);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $result = $invitations->registerAndAccept(
            $invitation,
            $validated['name'],
            $validated['password'],
        );

        return response()->json([
            'user' => $result['user']->load('activeVenue'),
            'token' => $result['token'],
            'membership' => $result['membership'],
            'venue_id' => $invitation->venue_id,
        ], 201);
    }

    public function accept(Request $request, string $token, VenueStaffInvitationService $invitations): JsonResponse
    {
        $invitation = $invitations->findUsableByToken($token);
        $user = $request->user();

        $membership = $invitations->accept($invitation, $user);

        return response()->json([
            'membership' => $membership,
            'venue_id' => $invitation->venue_id,
        ]);
    }

    private function invitationPayload(VenueStaffInvitation $invitation, ?\App\Models\Venue $venue = null): array
    {
        $venue ??= $invitation->venue()->withTrashed()->first();

        return [
            'email' => $invitation->email,
            'role' => $invitation->role,
            'status' => $invitation->status->value,
            'expires_at' => $invitation->expires_at,
            'venue' => $venue ? [
                'id' => $venue->id,
                'name' => $venue->name,
                'slug' => $venue->slug,
            ] : null,
            'inviter' => [
                'name' => $invitation->inviter?->name,
            ],
        ];
    }
}
