<?php

namespace App\Http\Controllers\Api;

use App\Enums\VenueStaffInvitationStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueStaffInvitation;
use App\Models\VenueUser;
use App\Services\VenueStaffInvitationService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
class VenueTeamController extends Controller
{
    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $members = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->with('user:id,name,email')
            ->orderByRaw("CASE role WHEN 'owner' THEN 0 WHEN 'staff' THEN 1 ELSE 2 END")
            ->get();

        $invitations = VenueStaffInvitation::query()
            ->where('venue_id', $venue->id)
            ->with(['inviter:id,name,email', 'acceptedBy:id,name,email'])
            ->orderByDesc('created_at')
            ->get();

        $service = app(VenueStaffInvitationService::class);

        foreach ($invitations as $invitation) {
            $service->syncExpiry($invitation);
        }

        $pending = $invitations->where('status', VenueStaffInvitationStatus::Pending)->values();
        $history = $invitations->whereIn('status', [
            VenueStaffInvitationStatus::Accepted,
            VenueStaffInvitationStatus::Expired,
            VenueStaffInvitationStatus::Cancelled,
        ])->values();

        return response()->json([
            'members' => $members,
            'pending_invitations' => $pending,
            'invitation_history' => $history,
        ]);
    }

    public function invite(Request $request, Venue $venue, VenueStaffInvitationService $invitations): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['sometimes', Rule::in(['staff'])],
        ]);

        $invitation = $invitations->invite(
            $venue,
            $request->user(),
            $validated['email'],
            $validated['role'] ?? 'staff',
        );

        return response()->json([
            'invitation' => $invitation->load(['inviter:id,name,email']),
        ], 201);
    }

    public function resendInvitation(
        Request $request,
        Venue $venue,
        VenueStaffInvitation $invitation,
        VenueStaffInvitationService $invitations,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        abort_unless($invitation->venue_id === $venue->id, 404);

        return response()->json([
            'invitation' => $invitations->resend($invitation)->load(['inviter:id,name,email']),
        ]);
    }

    public function cancelInvitation(
        Request $request,
        Venue $venue,
        VenueStaffInvitation $invitation,
        VenueStaffInvitationService $invitations,
    ): JsonResponse {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        abort_unless($invitation->venue_id === $venue->id, 404);

        return response()->json([
            'invitation' => $invitations->cancel($invitation)->load(['inviter:id,name,email']),
        ]);
    }

    public function update(Request $request, Venue $venue, User $user): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['staff'])],
        ]);

        abort_unless($request->user()->id !== $user->id, 422);

        $membership = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        abort_if($membership->role === 'owner', 422, 'The venue owner role cannot be changed.');

        $membership->update([
            'role' => $validated['role'],
        ]);

        return response()->json([
            'member' => $membership->fresh()->load('user:id,name,email'),
        ]);
    }

    public function destroy(Request $request, Venue $venue, User $user): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        abort_unless($request->user()->id !== $user->id, 422);

        $membership = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        abort_if($membership->role === 'owner', 422, 'The venue owner cannot be removed.');

        $membership->delete();

        if ($user->active_venue_id === $venue->id) {
            $nextVenueId = VenueUser::query()
                ->where('user_id', $user->id)
                ->latest()
                ->value('venue_id');

            $user->forceFill([
                'active_venue_id' => $nextVenueId,
            ])->save();
        }

        return response()->json(status: 204);
    }
}
