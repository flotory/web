<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\OwnerInvitation;
use App\Models\User;
use App\Models\Venue;
use App\Services\OwnerInvitationService;
use App\Services\VenuePublicationService;
use App\Support\VenueAccess;
use App\Support\VenuePresenter;
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

        $brandStatus = $venue?->brand?->status ?? Brand::STATUS_DRAFT;
        $inProgress = ! $venue instanceof Venue
            ? $mayCreate
            : in_array($brandStatus, [Brand::STATUS_DRAFT, Brand::STATUS_REJECTED], true);

        if ($venue instanceof Venue) {
            $listing = $this->publication->snapshot($venue);
            VenuePresenter::apply($venue);
        } else {
            $listing = null;
        }

        return response()->json([
            'active' => $inProgress,
            'business_name' => $invitation?->business_name,
            'venue' => $venue,
            'listing' => $listing,
        ]);
    }

    private function resolveOwnerVenue(User $user): ?Venue
    {
        $brandIds = BrandUser::query()
            ->where('user_id', $user->id)
            ->pluck('brand_id');

        if ($brandIds->isEmpty()) {
            return null;
        }

        return Venue::query()
            ->with('brand')
            ->whereIn('brand_id', $brandIds)
            ->where('is_primary', true)
            ->whereNull('deleted_at')
            ->latest('id')
            ->first();
    }
}
