<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminStoreVenueRequest;
use App\Http\Requests\AdminUpdateVenueRequest;
use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\User;
use App\Models\Venue;
use App\Services\VenueAddressUpdateService;
use App\Services\VenueBrandingService;
use App\Services\VenuePublicationService;
use App\Services\VenueTimezoneService;
use App\Support\AuditLog;
use App\Support\VenuePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminVenueManagementController extends Controller
{
    public function __construct(
        private VenueBrandingService $branding,
        private VenueAddressUpdateService $venueAddresses,
        private VenuePublicationService $publication,
        private VenueTimezoneService $timezones,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim($request->string('search')->toString());
        $status = $request->string('status')->toString();

        $query = Venue::query()
            ->where('is_primary', true)
            ->when($request->boolean('include_archived'), fn ($builder) => $builder->withTrashed())
            ->with('brand')
            ->withCount([
                'rewards as active_rewards_count' => fn ($builder) => $builder->where('active', true),
                'customers',
            ])
            ->with([
                'memberships' => fn ($builder) => $builder
                    ->where('role', 'owner')
                    ->with('user:id,name,email'),
            ])
            ->latest('updated_at');

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhereHas('brand', fn ($brandQuery) => $brandQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%"));
            });
        }

        if ($status !== '') {
            $query->whereHas('brand', fn ($brandQuery) => $brandQuery->where('status', $status));
        }

        $venues = $query->paginate(20);

        return response()->json([
            'venues' => collect($venues->items())
                ->map(fn (Venue $venue): array => $this->presentListVenue($venue))
                ->values(),
            'meta' => [
                'current_page' => $venues->currentPage(),
                'last_page' => $venues->lastPage(),
                'total' => $venues->total(),
            ],
        ]);
    }

    public function store(AdminStoreVenueRequest $request): JsonResponse
    {
        $ownerEmail = $request->string('owner_email')->toString();
        $owner = User::query()->firstWhere('email', $ownerEmail);

        if (! $owner instanceof User) {
            $owner = User::query()->create([
                'name' => $request->filled('owner_name')
                    ? $request->string('owner_name')->toString()
                    : Str::before($ownerEmail, '@'),
                'email' => $ownerEmail,
                'password' => Hash::make(Str::password(32)),
                'is_admin' => false,
            ]);
        } elseif ($request->filled('owner_name')) {
            $owner->forceFill([
                'name' => $request->string('owner_name')->toString(),
            ])->save();
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
            'user_id' => $owner->id,
            'role' => 'owner',
        ]);

        $this->timezones->applyToVenue($venue, $location['latitude'], $location['longitude']);

        $owner->forceFill([
            'active_venue_id' => $venue->id,
        ])->save();

        AuditLog::record(
            description: 'venue.admin_created',
            subject: $venue->fresh(['brand']),
            causer: $request->user(),
            event: 'created',
            properties: [
                'venue_id' => $venue->id,
                'brand_id' => $brand->id,
                'owner_user_id' => $owner->id,
            ],
        );

        $venue = $this->freshDetailVenue($venue);

        return response()->json([
            'venue' => $this->presentDetailVenue($venue),
        ], 201);
    }

    public function show(int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue)
            ->loadCount(['customers', 'visits', 'rewards'])
            ->load([
                'brand',
                'memberships' => fn ($builder) => $builder
                    ->where('role', 'owner')
                    ->with('user:id,name,email'),
            ]);

        return response()->json([
            'venue' => $this->presentDetailVenue($venue),
        ]);
    }

    public function update(AdminUpdateVenueRequest $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);
        $brand = $venue->brand()->firstOrFail();

        $location = $this->venueAddresses->normalizedLocation([
            'address' => $request->input('address'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'google_place_id' => $request->input('google_place_id'),
        ]);

        $this->venueAddresses->assertCanApply($venue, $location, enforceDailyLimit: false);
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

        AuditLog::record(
            description: 'venue.admin_updated',
            subject: $venue->fresh(['brand']),
            causer: $request->user(),
            event: 'updated',
            properties: [
                'venue_id' => $venue->id,
                'brand_id' => $brand->id,
            ],
        );

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function uploadLogo(Request $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);

        $request->validate([
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        $this->branding->applyLogo($venue, $request->file('logo'), $request->user());

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function destroyLogo(Request $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);

        $this->branding->clearLogo($venue);

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function uploadCover(Request $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);

        $request->validate([
            'cover' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        $this->branding->applyCover($venue, $request->file('cover'), $request->user());

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function destroyCover(Request $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);

        $this->branding->clearCover($venue);

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function approveBranch(Request $request, int $venue): JsonResponse
    {
        $branch = $this->resolveVenue($venue);
        $approved = $this->publication->approveBranch($branch, $request->user());

        return response()->json([
            'branch' => VenuePresenter::attributes($approved),
        ]);
    }

    public function rejectBranch(Request $request, int $venue): JsonResponse
    {
        $branch = $this->resolveVenue($venue);
        $rejected = $this->publication->rejectBranch(
            $branch,
            $request->user(),
            $request->string('note')->toString() ?: null,
        );

        return response()->json([
            'branch' => VenuePresenter::attributes($rejected),
        ]);
    }

    private function freshDetailVenue(Venue $venue): Venue
    {
        return $venue->fresh(['brand'])
            ->loadCount(['customers', 'visits', 'rewards'])
            ->load([
                'memberships' => fn ($builder) => $builder
                    ->where('role', 'owner')
                    ->with('user:id,name,email'),
            ]);
    }

    private function resolveVenue(int $venueId): Venue
    {
        return Venue::query()->withTrashed()->with('brand')->findOrFail($venueId);
    }

    /**
     * @return array<string, mixed>
     */
    private function presentListVenue(Venue $venue): array
    {
        $presented = VenuePresenter::attributes($venue);
        $ownerMembership = $venue->memberships->first();

        return [
            'id' => $venue->id,
            'brand_id' => $venue->brand_id,
            'name' => $venue->name,
            'slug' => $venue->slug,
            'category' => $presented['category'] ?? null,
            'address' => $venue->address,
            'logo' => $presented['logo'] ?? null,
            'logo_thumb' => $presented['logo_thumb'] ?? null,
            'cover_image' => $presented['cover_image'] ?? null,
            'status' => $presented['status'] ?? Brand::STATUS_DRAFT,
            'archived' => $venue->trashed(),
            'active_rewards_count' => $venue->active_rewards_count ?? 0,
            'customers_count' => $venue->customers_count ?? 0,
            'owner' => $ownerMembership?->user ? [
                'id' => $ownerMembership->user->id,
                'name' => $ownerMembership->user->name,
                'email' => $ownerMembership->user->email,
            ] : null,
            'listing' => $this->publication->snapshot($venue),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function presentDetailVenue(Venue $venue): array
    {
        $presented = VenuePresenter::attributes($venue);
        $ownerMembership = $venue->relationLoaded('memberships')
            ? $venue->memberships->firstWhere('role', 'owner') ?? $venue->memberships->first()
            : $venue->memberships()->where('role', 'owner')->with('user:id,name,email')->first();

        return array_merge($this->presentListVenue($venue), [
            'logo_thumb' => $presented['logo_thumb'] ?? null,
            'cover_image_thumb' => $presented['cover_image_thumb'] ?? null,
            'latitude' => $venue->latitude,
            'longitude' => $venue->longitude,
            'google_place_id' => $venue->google_place_id,
            'phone' => $presented['phone'] ?? null,
            'website' => $presented['website'] ?? null,
            'average_check_amount' => $presented['average_check_amount'] ?? null,
            'review_note' => $presented['review_note'] ?? null,
            'submitted_at' => $presented['submitted_at'] ?? null,
            'published_at' => $presented['published_at'] ?? null,
            'visits_count' => $venue->visits_count ?? 0,
            'rewards_count' => $venue->rewards_count ?? 0,
            'is_branch' => ! $venue->is_primary,
            'location_status' => $venue->is_primary ? null : ($venue->location_status ?? null),
            'owner' => $ownerMembership?->user ? [
                'id' => $ownerMembership->user->id,
                'name' => $ownerMembership->user->name,
                'email' => $ownerMembership->user->email,
            ] : null,
        ]);
    }
}
