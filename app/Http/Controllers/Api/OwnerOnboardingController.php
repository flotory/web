<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OwnerInvitation;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Services\OwnerInvitationService;
use App\Services\VenuePublicationService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OwnerOnboardingController extends Controller
{
    public function __construct(
        private OwnerInvitationService $ownerInvitations,
        private VenuePublicationService $publication,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User || VenueAccess::isAdmin($user)) {
            return response()->json(['active' => false]);
        }

        $invitation = OwnerInvitation::query()
            ->where('email', Str::lower($user->email))
            ->whereNotNull('accepted_at')
            ->latest('accepted_at')
            ->first();

        $venue = $this->resolveOwnerVenue($user);
        $mayCreate = $this->ownerInvitations->userMaySelfCreateVenue($user);

        if (! $venue instanceof Venue && ! $mayCreate) {
            return response()->json(['active' => false]);
        }

        $inProgress = ! $venue instanceof Venue
            ? $mayCreate
            : in_array($venue->status ?? Venue::STATUS_DRAFT, [Venue::STATUS_DRAFT, Venue::STATUS_REJECTED], true);

        return response()->json([
            'active' => $inProgress,
            'business_name' => $invitation?->business_name,
            'venue' => $venue,
            'listing' => $venue instanceof Venue ? $this->publication->snapshot($venue) : null,
        ]);
    }

    private function resolveOwnerVenue(User $user): ?Venue
    {
        return Venue::query()
            ->select('venues.*')
            ->selectSub(
                VenueUser::query()
                    ->select('role')
                    ->whereColumn('venue_id', 'venues.id')
                    ->where('user_id', $user->id)
                    ->limit(1),
                'membership_role',
            )
            ->whereIn('id', VenueUser::query()->where('user_id', $user->id)->select('venue_id'))
            ->whereNull('parent_venue_id')
            ->whereNull('deleted_at')
            ->latest('id')
            ->first();
    }
}
