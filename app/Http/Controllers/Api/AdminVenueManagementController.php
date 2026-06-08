<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminUpdateVenueRequest;
use App\Models\Venue;
use App\Services\ImageThumbnailService;
use App\Services\VenueAddressUpdateService;
use App\Services\VenuePublicationService;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class AdminVenueManagementController extends Controller
{
    public function __construct(
        private ImageThumbnailService $images,
        private VenueAddressUpdateService $venueAddresses,
        private VenuePublicationService $publication,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim($request->string('search')->toString());
        $status = $request->string('status')->toString();

        $query = Venue::query()
            ->when($request->boolean('include_archived'), fn ($builder) => $builder->withTrashed())
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
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
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

    public function show(int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue)
            ->loadCount(['customers', 'visits', 'rewards'])
            ->load([
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

        $location = $this->venueAddresses->normalizedLocation([
            'address' => $request->input('address'),
            'latitude' => $request->input('latitude'),
            'longitude' => $request->input('longitude'),
            'google_place_id' => $request->input('google_place_id'),
        ]);

        $this->venueAddresses->assertCanApply($venue, $location, enforceDailyLimit: false);
        $this->venueAddresses->recordChangeIfNeeded($venue, $request->user(), $location);

        $venue->update([
            'name' => $request->string('name')->toString(),
            'slug' => $request->filled('slug')
                ? $request->string('slug')->toString()
                : $venue->slug,
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

        AuditLog::record(
            description: 'venue.admin_updated',
            subject: $venue->fresh(),
            causer: $request->user(),
            event: 'updated',
            properties: [
                'venue_id' => $venue->id,
            ],
        );

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function uploadLogo(Request $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);

        $validated = $request->validate([
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        $this->deleteLocalLogo($venue);

        $file = $request->file('logo');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'png');
        $filename = Str::slug($venue->slug).'-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-logos');

        File::ensureDirectoryExists($directory);
        $stored = $this->images->storeWithThumbnail(
            $file,
            $directory,
            $filename,
            ImageThumbnailService::THUMB_MAX_LOGO,
        );

        $venue->forceFill([
            'logo' => $stored['path'],
            'logo_thumb' => $stored['thumb_path'],
        ])->save();

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function destroyLogo(Request $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);

        $this->deleteLocalLogo($venue);

        $venue->forceFill([
            'logo' => null,
            'logo_thumb' => null,
        ])->save();

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

        $this->deleteLocalCover($venue);

        $file = $request->file('cover');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $filename = Str::slug($venue->slug).'-cover-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-covers');

        File::ensureDirectoryExists($directory);
        $stored = $this->images->storeWithThumbnail(
            $file,
            $directory,
            $filename,
            ImageThumbnailService::THUMB_MAX_COVER,
        );

        $venue->forceFill([
            'cover_image' => $stored['path'],
            'cover_image_thumb' => $stored['thumb_path'],
        ])->save();

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    public function destroyCover(Request $request, int $venue): JsonResponse
    {
        $venue = $this->resolveVenue($venue);

        $this->deleteLocalCover($venue);

        $venue->forceFill([
            'cover_image' => null,
            'cover_image_thumb' => null,
        ])->save();

        return response()->json([
            'venue' => $this->presentDetailVenue($this->freshDetailVenue($venue)),
        ]);
    }

    private function freshDetailVenue(Venue $venue): Venue
    {
        return $venue->fresh()
            ->loadCount(['customers', 'visits', 'rewards'])
            ->load([
                'memberships' => fn ($builder) => $builder
                    ->where('role', 'owner')
                    ->with('user:id,name,email'),
            ]);
    }

    private function resolveVenue(int $venueId): Venue
    {
        return Venue::query()->withTrashed()->findOrFail($venueId);
    }

    /**
     * @return array<string, mixed>
     */
    private function presentListVenue(Venue $venue): array
    {
        $ownerMembership = $venue->memberships->first();

        return [
            'id' => $venue->id,
            'name' => $venue->name,
            'slug' => $venue->slug,
            'category' => $venue->category,
            'address' => $venue->address,
            'logo' => $venue->logo,
            'logo_thumb' => $venue->logo_thumb,
            'cover_image' => $venue->cover_image,
            'status' => $venue->status,
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
        $ownerMembership = $venue->relationLoaded('memberships')
            ? $venue->memberships->firstWhere('role', 'owner') ?? $venue->memberships->first()
            : $venue->memberships()->where('role', 'owner')->with('user:id,name,email')->first();

        return array_merge($this->presentListVenue($venue), [
            'logo_thumb' => $venue->logo_thumb,
            'cover_image_thumb' => $venue->cover_image_thumb,
            'latitude' => $venue->latitude,
            'longitude' => $venue->longitude,
            'google_place_id' => $venue->google_place_id,
            'phone' => $venue->phone,
            'website' => $venue->website,
            'review_note' => $venue->review_note,
            'submitted_at' => $venue->submitted_at?->toIso8601String(),
            'published_at' => $venue->published_at?->toIso8601String(),
            'visits_count' => $venue->visits_count ?? 0,
            'rewards_count' => $venue->rewards_count ?? 0,
            'owner' => $ownerMembership?->user ? [
                'id' => $ownerMembership->user->id,
                'name' => $ownerMembership->user->name,
                'email' => $ownerMembership->user->email,
            ] : null,
        ]);
    }

    private function deleteLocalLogo(Venue $venue): void
    {
        foreach ([$venue->logo, $venue->logo_thumb] as $path) {
            if (! $path || ! str_starts_with($path, '/uploads/venue-logos/')) {
                continue;
            }

            File::delete(public_path(ltrim($path, '/')));
        }

        if ($venue->logo) {
            $this->images->deleteThumbnailFor($venue->logo);
        }
    }

    private function deleteLocalCover(Venue $venue): void
    {
        foreach ([$venue->cover_image, $venue->cover_image_thumb] as $path) {
            if (! $path || ! str_starts_with($path, '/uploads/venue-covers/')) {
                continue;
            }

            File::delete(public_path(ltrim($path, '/')));
        }

        if ($venue->cover_image) {
            $this->images->deleteThumbnailFor($venue->cover_image);
        }
    }
}
