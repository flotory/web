<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOwnerOnboardingDraftRequest;
use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\OwnerInvitation;
use App\Models\OwnerOnboardingDraftFile;
use App\Models\User;
use App\Models\Venue;
use App\Services\OwnerInvitationService;
use App\Services\OwnerOnboardingDraftService;
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
        private OwnerOnboardingDraftService $drafts,
        private VenuePublicationService $publication,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User || VenueAccess::isAdmin($user)) {
            return response()->json(['active' => false]);
        }

        $invitation = $this->acceptedInvitation($user);
        $venue = $this->resolveOwnerVenue($user);
        $mayCreate = $this->ownerInvitations->userMaySelfCreateVenue($user);
        $usesDraft = $this->userUsesFirstVenueDraft($user, $venue, $mayCreate);

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

            return response()->json([
                'active' => $inProgress,
                'uses_draft' => false,
                'purpose' => null,
                'business_name' => $invitation?->business_name,
                'venue' => $venue,
                'draft' => null,
                'listing' => $listing,
            ]);
        }

        $draft = $this->drafts->getOrCreate($user, $invitation?->business_name);
        $listing = $this->drafts->listingSnapshot($draft);

        return response()->json([
            'active' => $inProgress,
            'uses_draft' => $usesDraft,
            'purpose' => OwnerOnboardingDraftService::PURPOSE_FIRST_VENUE,
            'business_name' => $invitation?->business_name,
            'venue' => null,
            'draft' => $draft->payload,
            'listing' => $listing,
        ]);
    }

    public function showAdditionalVenue(Request $request): JsonResponse
    {
        $user = $this->requireAdditionalVenueDraftUser($request);
        $draft = $this->drafts->findForUser($user);

        if (! $draft instanceof \App\Models\OwnerOnboardingDraft) {
            abort(404);
        }

        return response()->json([
            'purpose' => OwnerOnboardingDraftService::PURPOSE_ADDITIONAL_VENUE,
            'draft' => $draft->payload,
            'listing' => $this->drafts->listingSnapshot($draft),
            'files' => $this->drafts->listFiles($user),
        ]);
    }

    public function updateDraft(UpdateOwnerOnboardingDraftRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User || VenueAccess::isAdmin($user)) {
            abort(403);
        }

        $validated = $request->validated();
        $purpose = $validated['purpose'] ?? OwnerOnboardingDraftService::PURPOSE_FIRST_VENUE;
        $restart = (bool) ($validated['restart'] ?? false);
        unset($validated['purpose'], $validated['restart']);

        if ($purpose === OwnerOnboardingDraftService::PURPOSE_ADDITIONAL_VENUE) {
            $this->assertMayStartAdditionalVenueDraft($user);
            $payload = $this->drafts->update($user, $validated, null, $purpose, $restart);
        } else {
            if (! $this->userUsesFirstVenueDraft($user, $this->resolveOwnerVenue($user), $this->ownerInvitations->userMaySelfCreateVenue($user))) {
                abort(403);
            }

            $invitation = $this->acceptedInvitation($user);
            $payload = $this->drafts->update($user, $validated, $invitation?->business_name);
        }

        $draft = $this->drafts->findForUser($user);

        return response()->json([
            'draft' => $payload,
            'listing' => $draft ? $this->drafts->listingSnapshot($draft) : null,
        ]);
    }

    public function destroyDraft(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User || VenueAccess::isAdmin($user)) {
            abort(403);
        }

        $this->drafts->purgeDraft($user);

        return response()->json(status: 204);
    }

    public function draftFiles(Request $request): JsonResponse
    {
        $user = $this->requireActiveDraftUser($request);

        return response()->json([
            'files' => $this->drafts->listFiles($user),
        ]);
    }

    public function storeDraftFile(Request $request): JsonResponse
    {
        $user = $this->requireActiveDraftUser($request);

        $request->validate([
            'file' => ['required', 'file'],
        ]);

        $file = $this->drafts->storeFile($user, $request->file('file'));
        $draft = $this->drafts->findForUser($user);

        return response()->json([
            'file' => $this->drafts->presentFile($file),
            'listing' => $draft ? $this->drafts->listingSnapshot($draft) : null,
        ], 201);
    }

    public function destroyDraftFile(Request $request, OwnerOnboardingDraftFile $draftFile): JsonResponse
    {
        $user = $this->requireActiveDraftUser($request);
        $this->drafts->deleteFile($user, $draftFile);
        $draft = $this->drafts->findForUser($user);

        return response()->json([
            'listing' => $draft ? $this->drafts->listingSnapshot($draft) : null,
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $user = $this->requireActiveDraftUser($request);
        $venue = $this->drafts->submit($user);

        return response()->json([
            'venue' => $venue,
            'listing' => $this->publication->snapshot($venue),
        ]);
    }

    private function requireActiveDraftUser(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User || VenueAccess::isAdmin($user)) {
            abort(403);
        }

        $draft = $this->drafts->findForUser($user);

        if (! $draft instanceof \App\Models\OwnerOnboardingDraft) {
            abort(404);
        }

        if ($draft->purpose === OwnerOnboardingDraftService::PURPOSE_ADDITIONAL_VENUE) {
            $this->assertMayStartAdditionalVenueDraft($user);

            return $user;
        }

        if (! $this->userUsesFirstVenueDraft($user, $this->resolveOwnerVenue($user), $this->ownerInvitations->userMaySelfCreateVenue($user))) {
            abort(403);
        }

        return $user;
    }

    private function requireAdditionalVenueDraftUser(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User || VenueAccess::isAdmin($user)) {
            abort(403);
        }

        $this->assertMayStartAdditionalVenueDraft($user);

        return $user;
    }

    private function assertMayStartAdditionalVenueDraft(User $user): void
    {
        if (! $this->ownerInvitations->userMaySelfCreateVenue($user)) {
            abort(403);
        }

        if (! $this->userHasLiveBrand($user)) {
            abort(403);
        }
    }

    private function userUsesFirstVenueDraft(User $user, ?Venue $venue, bool $mayCreate): bool
    {
        if ($venue instanceof Venue) {
            return false;
        }

        if (! $mayCreate) {
            return false;
        }

        return ! BrandUser::query()->where('user_id', $user->id)->exists();
    }

    private function userHasLiveBrand(User $user): bool
    {
        return Brand::query()
            ->whereIn('id', BrandUser::query()
                ->where('user_id', $user->id)
                ->where('role', 'owner')
                ->pluck('brand_id'))
            ->whereNull('deleted_at')
            ->whereIn('status', [Brand::STATUS_PUBLISHED, Brand::STATUS_PENDING_REVIEW])
            ->exists();
    }

    private function acceptedInvitation(User $user): ?OwnerInvitation
    {
        return OwnerInvitation::query()
            ->where('email', Str::lower($user->email))
            ->whereNotNull('accepted_at')
            ->latest('accepted_at')
            ->first();
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
