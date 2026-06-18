<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRestaurantRequest;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Services\VenueAddressUpdateService;
use App\Services\VenuePublicationService;
use App\Services\VenueTimezoneService;
use App\Support\VenueAccess;
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
    ) {}
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (VenueAccess::isAdmin($user)) {
            return response()->json(['venues' => []]);
        }

        return response()->json([
            'venues' => Venue::query()
                ->select('venues.*')
                ->selectSub(
                    VenueUser::query()
                        ->select('role')
                        ->whereColumn('venue_id', 'venues.id')
                        ->where('user_id', $user->id)
                        ->limit(1),
                    'membership_role',
                )
                ->withTrashed()
                ->withCount([
                    'customers',
                    'visits',
                    'rewards',
                ])
                ->whereIn('id', VenueUser::query()->where('user_id', $user->id)->select('venue_id'))
                ->whereNull('parent_venue_id')
                ->orderByRaw('deleted_at is not null')
                ->latest()
                ->get(),
        ]);
    }

    public function discover(Request $request): JsonResponse
    {
        $user = $this->optionalAuthenticatedUser($request);

        return response()->json([
            'venues' => Venue::query()
                ->published()
                ->whereNull('parent_venue_id')
                ->whereNull('deleted_at')
                ->with(['branches' => fn ($query) => $query
                    ->whereNull('deleted_at')
                    ->orderBy('name')
                    ->select(['id', 'parent_venue_id', 'name', 'slug', 'address', 'latitude', 'longitude']),
                ])
                ->withCount([
                    'customers',
                    'visits',
                    'rewards',
                    'branches',
                    'customers as joined_count' => fn ($query) => $user instanceof User
                        ? $query->where('user_id', $user->id)
                        : $query->whereRaw('0 = 1'),
                ])
                ->orderBy('name')
                ->get()
                ->map(fn (Venue $venue): array => $this->presentDiscoverVenue($venue))
                ->values(),
        ]);
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
    private function presentDiscoverVenue(Venue $venue): array
    {
        $primaryBranch = $venue->branches->first();

        return [
            'id' => $venue->id,
            'name' => $venue->name,
            'slug' => $venue->slug,
            'category' => $venue->category,
            'logo' => $venue->logo,
            'logo_thumb' => $venue->logo_thumb,
            'cover_image' => $venue->cover_image,
            'cover_image_thumb' => $venue->cover_image_thumb,
            'address' => $venue->address ?? $primaryBranch?->address,
            'latitude' => $venue->latitude ?? $primaryBranch?->latitude,
            'longitude' => $venue->longitude ?? $primaryBranch?->longitude,
            'customers_count' => $venue->customers_count,
            'visits_count' => $venue->visits_count,
            'rewards_count' => $venue->rewards_count,
            'joined_count' => $venue->joined_count,
            'branches_count' => $venue->branches_count,
            'branches' => $venue->branches->map(fn (Venue $branch): array => [
                'id' => $branch->id,
                'name' => $branch->name,
                'slug' => $branch->slug,
                'address' => $branch->address,
                'latitude' => $branch->latitude,
                'longitude' => $branch->longitude,
            ])->values()->all(),
        ];
    }

    public function publicLanding(string $slug): JsonResponse
    {
        $venue = Venue::query()
            ->with('parentVenue')
            ->where('slug', $slug)
            ->whereNull('deleted_at')
            ->first();

        if (! $venue || ! $this->publication->isPublic($venue)) {
            abort(404, 'Venue not found');
        }

        $loyaltyVenue = $venue->loyaltyVenue();

        $milestones = $loyaltyVenue->rewards()
            ->where('active', true)
            ->where('reward_type', 'milestone')
            ->orderBy('required_stamps')
            ->orderBy('sort_order')
            ->limit(6)
            ->get(['id', 'title', 'description', 'image', 'image_thumb', 'required_stamps']);

        $heroReward = $milestones->first();

        $membersCount = $loyaltyVenue->customers()->count();
        $rewardsClaimedCount = RewardUnlock::query()
            ->whereNotNull('claimed_at')
            ->whereHas('customer', static fn ($query) => $query->where('venue_id', $loyaltyVenue->id))
            ->count();

        return response()->json([
            'venue' => [
                'id' => $venue->id,
                'loyalty_venue_id' => $loyaltyVenue->id,
                'name' => $venue->name,
                'slug' => $venue->slug,
                'category' => $loyaltyVenue->category,
                'logo' => $loyaltyVenue->logo,
                'logo_thumb' => $loyaltyVenue->logo_thumb,
                'cover_image' => $loyaltyVenue->cover_image,
                'cover_image_thumb' => $loyaltyVenue->cover_image_thumb,
                'address' => $venue->address,
                'latitude' => $venue->latitude,
                'longitude' => $venue->longitude,
                'is_branch' => $venue->isBranch(),
                'brand_name' => $loyaltyVenue->name,
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
        return response()->json([
            'venue' => $request->user()->activeVenue,
        ]);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        return response()->json([
            'venue' => $this->presentVenue($venue->loadCount(['customers', 'visits', 'rewards', 'branches'])),
        ]);
    }

    public function store(StoreRestaurantRequest $request): JsonResponse
    {
        $user = $request->user();
        VenueAccess::assertNotPlatformAdmin($user);

        $location = $this->venueAddresses->normalizedLocation([
            'address' => $request->input('address'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'google_place_id' => $request->input('google_place_id'),
        ]);

        $this->venueAddresses->assertCanApply(new Venue, $location, enforceDailyLimit: false);

        $venue = Venue::create([
            'name' => $request->string('name')->toString(),
            'slug' => $request->filled('slug')
                ? $request->string('slug')->toString()
                : Str::slug($request->string('name')->toString()).'-'.Str::lower(Str::random(5)),
            'category' => $request->string('category')->toString() ?: 'cafe',
            'logo' => null,
            'logo_thumb' => null,
            'cover_image' => null,
            'address' => $location['address'],
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'google_place_id' => $location['google_place_id'],
            'phone' => $request->string('phone')->toString() ?: null,
            'website' => $request->string('website')->toString() ?: null,
            'status' => Venue::STATUS_DRAFT,
        ]);

        VenueUser::create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $this->timezones->applyToVenue($venue, $location['latitude'], $location['longitude']);

        $user->forceFill([
            'active_venue_id' => $venue->id,
        ])->save();

        return response()->json([
            'venue' => $this->presentVenue($venue->fresh()),
        ], 201);
    }

    public function update(StoreRestaurantRequest $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

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
            'category' => $request->filled('category')
                ? $request->string('category')->toString()
                : $venue->category,
            'address' => $location['address'],
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'google_place_id' => $location['google_place_id'],
            'phone' => $request->string('phone')->toString() ?: null,
            'website' => $request->string('website')->toString() ?: null,
        ]);

        $venue = $venue->fresh();
        $this->timezones->applyToVenue($venue, $location['latitude'], $location['longitude']);

        return response()->json([
            'venue' => $this->presentVenue($venue->fresh()->loadCount(['customers', 'visits', 'rewards'])),
        ]);
    }

    public function destroy(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $venue->delete();

        if ($request->user()->active_venue_id === $venue->id) {
            $nextVenueId = VenueUser::query()
                ->where('user_id', $request->user()->id)
                ->where('venue_id', '!=', $venue->id)
                ->latest()
                ->value('venue_id');

            $request->user()->forceFill([
                'active_venue_id' => $nextVenueId,
            ])->save();
        }

        return response()->json(status: 204);
    }

    public function select(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue);

        $brand = $venue->loyaltyVenue();

        $request->user()->forceFill([
            'active_venue_id' => $brand->id,
        ])->save();

        return response()->json([
            'venue' => $brand->loadCount(['customers', 'visits', 'rewards', 'branches']),
        ]);
    }

    private function presentVenue(Venue $venue): Venue
    {
        $venue->setAttribute('address_quota', $this->venueAddresses->quotaFor($venue));

        return $venue;
    }

}

