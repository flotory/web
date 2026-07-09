<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRestaurantRequest;
use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Services\OwnerInvitationService;
use App\Services\VenueAddressUpdateService;
use App\Services\VenuePublicationService;
use App\Services\VenueSetupFileService;
use App\Services\VenueTimezoneService;
use App\Support\VenueAccess;
use App\Support\VenuePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class VenueController extends Controller
{
    public function __construct(
        private VenueAddressUpdateService $venueAddresses,
        private VenuePublicationService $publication,
        private VenueTimezoneService $timezones,
        private OwnerInvitationService $ownerInvitations,
        private VenueSetupFileService $setupFiles,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (VenueAccess::isAdmin($user)) {
            return response()->json(['venues' => []]);
        }

        $brandIds = BrandUser::query()
            ->where('user_id', $user->id)
            ->pluck('brand_id');

        $this->purgeNeverSubmittedDraftBrands($brandIds);

        $brandIds = BrandUser::query()
            ->where('user_id', $user->id)
            ->pluck('brand_id');

        $setupPreviews = $this->setupFiles->logoPreviewPathsForBrandIds($brandIds);

        $venues = Venue::query()
            ->with('brand')
            ->withTrashed()
            ->withCount(['visits', 'stampEvents'])
            ->whereIn('brand_id', $brandIds)
            ->orderByRaw('deleted_at is not null')
            ->orderByDesc('is_primary')
            ->latest()
            ->get()
            ->map(function (Venue $venue) use ($user, $setupPreviews): array {
                $brand = $venue->brand;
                $membership = BrandUser::query()
                    ->where('brand_id', $venue->brand_id)
                    ->where('user_id', $user->id)
                    ->first();

                $presented = VenuePresenter::apply($venue, $setupPreviews[$venue->brand_id] ?? null);
                $presented->setAttribute('membership_role', $membership?->role);
                $presented->setAttribute('customers_count', $brand?->customers()->count() ?? 0);
                $presented->setAttribute('rewards_count', $brand?->rewards()->count() ?? 0);
                $presented->setAttribute('visits_count', $venue->visits_count ?? 0);
                $presented->setAttribute('branches_count', max(($brand?->venues()->count() ?? 1) - 1, 0));
                $presented->setAttribute('address_quota', $this->venueAddresses->quotaFor($venue));

                return $presented->toArray();
            })
            ->values();

        return response()->json(['venues' => $venues]);
    }

    public function discover(Request $request): JsonResponse
    {
        $user = $this->optionalAuthenticatedUser($request);

        $venues = Venue::query()
            ->whereNull('deleted_at')
            ->where('is_primary', true)
            ->whereHas('brand', fn ($query) => $query
                ->published()
                ->whereNull('deleted_at'))
            ->with(['brand.venues' => fn ($query) => $query
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->select([
                    'id',
                    'brand_id',
                    'name',
                    'slug',
                    'address',
                    'latitude',
                    'longitude',
                    'is_primary',
                    'location_status',
                    'location_submitted_at',
                    'location_published_at',
                    'location_review_note',
                    'deleted_at',
                ]),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Venue $venue): array => $this->presentDiscoverVenue($venue, $user))
            ->values();

        return response()->json(['venues' => $venues]);
    }

    private function optionalAuthenticatedUser(Request $request): ?User
    {
        $user = $request->user();
        if ($user instanceof User) {
            return $user;
        }

        $bearer = $request->bearerToken();
        if (! is_string($bearer) || trim($bearer) === '') {
            return null;
        }

        $token = PersonalAccessToken::findToken($bearer);
        $user = $token?->tokenable;

        return $user instanceof User ? $user : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentDiscoverVenue(Venue $venue, ?User $user): array
    {
        $brand = $venue->brand;
        $siblings = $brand->venues->where('id', '!=', $venue->id)->values();

        return [
            'id' => $venue->id,
            'brand_id' => $brand->id,
            'name' => $venue->name,
            'slug' => $venue->slug,
            'category' => $brand->category,
            'logo' => $brand->logo,
            'logo_thumb' => $brand->logo_thumb,
            'cover_image' => $brand->cover_image,
            'cover_image_thumb' => $brand->cover_image_thumb,
            'address' => $venue->address,
            'latitude' => $venue->latitude,
            'longitude' => $venue->longitude,
            'customers_count' => $brand->customers()->count(),
            'visits_count' => $venue->visits()->count(),
            'rewards_count' => $brand->rewards()->count(),
            'joined_count' => $user instanceof User
                ? $brand->customers()->where('user_id', $user->id)->count()
                : 0,
            'branches_count' => max($brand->venues->count() - 1, 0),
            'brand_name' => $brand->name,
            'branches' => $brand->venues
                ->where('is_primary', false)
                ->filter(fn (Venue $location): bool => $this->publication->isPublic($location))
                ->values()
                ->map(fn (Venue $location): array => [
                'id' => $location->id,
                'name' => $location->name,
                'slug' => $location->slug,
                'address' => $location->address,
                'latitude' => $location->latitude,
                'longitude' => $location->longitude,
            ])->values()->all(),
            'loyalty_brand_id' => $brand->id,
        ];
    }

    public function publicLanding(string $slug): JsonResponse
    {
        $venue = Venue::query()
            ->with('brand')
            ->where('slug', $slug)
            ->whereNull('deleted_at')
            ->first();

        if (! $venue || ! $this->publication->isPublic($venue)) {
            abort(404, 'Venue not found');
        }

        $brand = $venue->brand;

        $milestones = $brand->rewards()
            ->where('active', true)
            ->where('reward_type', 'milestone')
            ->orderBy('required_stamps')
            ->orderBy('sort_order')
            ->limit(6)
            ->get(['id', 'title', 'description', 'image', 'image_thumb', 'required_stamps']);

        $heroReward = $milestones->first();

        $membersCount = $brand->customers()->count();
        $rewardsClaimedCount = RewardUnlock::query()
            ->whereNotNull('claimed_at')
            ->whereHas('customer', static fn ($query) => $query->where('brand_id', $brand->id))
            ->count();

        return response()->json([
            'venue' => [
                'id' => $venue->id,
                'brand_id' => $brand->id,
                'loyalty_brand_id' => $brand->id,
                'loyalty_venue_id' => $brand->id,
                'name' => $venue->name,
                'slug' => $venue->slug,
                'category' => $brand->category,
                'logo' => $brand->logo,
                'logo_thumb' => $brand->logo_thumb,
                'cover_image' => $brand->cover_image,
                'cover_image_thumb' => $brand->cover_image_thumb,
                'address' => $venue->address,
                'latitude' => $venue->latitude,
                'longitude' => $venue->longitude,
                'is_branch' => ! $venue->is_primary,
                'brand_name' => $brand->name,
            ],
            'milestones' => $milestones,
            'hero_reward' => $heroReward ? [
                'id' => $heroReward->id,
                'title' => $heroReward->title,
                'description' => $heroReward->description,
                'image' => $heroReward->image,
                'image_thumb' => $heroReward->image_thumb,
                'required_stamps' => $heroReward->required_stamps,
            ] : null,
            'social_proof' => [
                'members_count' => $membersCount,
                'rewards_claimed_count' => $rewardsClaimedCount,
            ],
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $venue = $request->user()->activeVenue;
        if ($venue) {
            $venue->load('brand');
            VenuePresenter::apply($venue);
        }

        return response()->json([
            'venue' => $venue,
        ]);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        $venue->load('brand')->loadCount(['visits', 'stampEvents']);
        $brand = $venue->brand;
        $venue->setAttribute('customers_count', $brand->customers()->count());
        $venue->setAttribute('rewards_count', $brand->rewards()->count());
        $venue->setAttribute('branches_count', max($brand->venues()->count() - 1, 0));

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    public function store(StoreRestaurantRequest $request): JsonResponse
    {
        $user = $request->user();
        VenueAccess::assertNotPlatformAdmin($user);

        if (! $this->ownerInvitations->userMaySelfCreateVenue($user)) {
            return response()->json([
                'message' => 'Venue setup is handled by the Flotory team. Book a demo to get started.',
            ], 403);
        }

        $location = $this->venueAddresses->normalizedLocation([
            'address' => $request->input('address'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'google_place_id' => $request->input('google_place_id'),
        ]);

        $this->venueAddresses->assertCanApply(new Venue, $location, enforceDailyLimit: false);

        $name = $request->string('name')->toString();
        $slug = $request->filled('slug')
            ? $request->string('slug')->toString()
            : Str::slug($name).'-'.Str::lower(Str::random(5));

        $brand = Brand::create([
            'name' => $name,
            'slug' => $slug,
            'category' => $request->string('category')->toString() ?: 'cafe',
            'phone' => $request->string('phone')->toString() ?: null,
            'website' => $request->string('website')->toString() ?: null,
            'status' => Brand::STATUS_DRAFT,
        ]);

        $venue = Venue::create([
            'brand_id' => $brand->id,
            'is_primary' => true,
            'name' => $name,
            'slug' => $slug,
            'address' => $location['address'],
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'google_place_id' => $location['google_place_id'],
        ]);

        BrandUser::create([
            'brand_id' => $brand->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $this->timezones->applyToVenue($venue, $location['latitude'], $location['longitude']);

        $user->forceFill([
            'active_venue_id' => $venue->id,
        ])->save();

        $this->ownerInvitations->attachBrandToAcceptedInvitation($user, $brand);

        return response()->json([
            'venue' => $this->presentVenue($venue->fresh(['brand'])),
        ], 201);
    }

    public function update(StoreRestaurantRequest $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $brand = $venue->brand()->firstOrFail();
        $location = $this->venueAddresses->normalizedLocation([
            'address' => $request->input('address'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'google_place_id' => $request->input('google_place_id'),
        ]);

        $this->venueAddresses->assertCanApply($venue, $location, enforceDailyLimit: true);
        $this->venueAddresses->recordChangeIfNeeded($venue, $request->user(), $location);

        $requestedSlug = $request->filled('slug')
            ? $request->string('slug')->toString()
            : $venue->slug;

        $this->publication->assertSlugCanChange($venue, $requestedSlug);

        $venue->update([
            'name' => $request->string('name')->toString(),
            'slug' => $requestedSlug,
            'address' => $location['address'],
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'google_place_id' => $location['google_place_id'],
        ]);

        $brand->update([
            'name' => $request->string('name')->toString(),
            'category' => $request->filled('category')
                ? $request->string('category')->toString()
                : $brand->category,
            'phone' => $request->string('phone')->toString() ?: null,
            'website' => $request->string('website')->toString() ?: null,
            'average_check_amount' => $request->filled('average_check_amount')
                ? $request->input('average_check_amount')
                : ($request->has('average_check_amount') ? null : $brand->average_check_amount),
        ]);

        $venue = $venue->fresh(['brand']);
        $this->timezones->applyToVenue($venue, $location['latitude'], $location['longitude']);

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    public function destroy(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        if ($venue->is_primary) {
            $venue->brand?->delete();
        }

        $venue->delete();

        if ($request->user()->active_venue_id === $venue->id) {
            $nextVenueId = Venue::query()
                ->whereIn('brand_id', BrandUser::query()
                    ->where('user_id', $request->user()->id)
                    ->pluck('brand_id'))
                ->where('id', '!=', $venue->id)
                ->latest()
                ->value('id');

            $request->user()->forceFill([
                'active_venue_id' => $nextVenueId,
            ])->save();
        }

        return response()->json(status: 204);
    }

    public function select(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue);

        $request->user()->forceFill([
            'active_venue_id' => $venue->id,
        ])->save();

        return response()->json([
            'venue' => $this->presentVenue($venue->fresh(['brand'])),
        ]);
    }

    private function presentVenue(Venue $venue): Venue
    {
        $venue->loadMissing('brand');

        $preview = $venue->brand
            ? $this->setupFiles->logoPreviewPathForBrand($venue->brand)
            : null;

        return VenuePresenter::apply($venue, $preview);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, int>  $brandIds
     */
    private function purgeNeverSubmittedDraftBrands($brandIds): void
    {
        if ($brandIds->isEmpty()) {
            return;
        }

        $hasLiveBrand = Brand::query()
            ->whereIn('id', $brandIds)
            ->whereNull('deleted_at')
            ->whereIn('status', [Brand::STATUS_PUBLISHED, Brand::STATUS_PENDING_REVIEW])
            ->exists();

        if (! $hasLiveBrand) {
            return;
        }

        $abandonedBrandIds = Brand::query()
            ->whereIn('id', $brandIds)
            ->where('status', Brand::STATUS_DRAFT)
            ->whereNull('submitted_at')
            ->pluck('id');

        foreach ($abandonedBrandIds as $brandId) {
            $brand = Brand::query()->find($brandId);

            if (! $brand instanceof Brand) {
                continue;
            }

            $brand->venues()->each(fn (Venue $venue): mixed => $venue->delete());
            BrandUser::query()->where('brand_id', $brand->id)->delete();
            $brand->delete();
        }
    }
}
