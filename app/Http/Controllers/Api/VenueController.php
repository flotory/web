<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRestaurantRequest;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class VenueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (VenueAccess::isAdmin($user)) {
            return response()->json([
                'venues' => Venue::query()
                    ->select('venues.*')
                    ->selectRaw("'owner' as membership_role")
                    ->withTrashed()
                    ->withCount(['customers', 'visits', 'rewards'])
                    ->orderByRaw('deleted_at is not null')
                    ->latest()
                    ->get(),
            ]);
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
                ->withCount(['customers', 'visits', 'rewards'])
                ->whereIn('id', VenueUser::query()->where('user_id', $user->id)->select('venue_id'))
                ->orderByRaw('deleted_at is not null')
                ->latest()
                ->get(),
        ]);
    }

    public function discover(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'venues' => Venue::query()
                ->withCount([
                    'customers',
                    'visits',
                    'rewards',
                    'customers as joined_count' => fn ($query) => $query->where('user_id', $user->id),
                ])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function publicLanding(string $slug): JsonResponse
    {
        $venue = Venue::query()
            ->where('slug', $slug)
            ->whereNull('deleted_at')
            ->first();

        if (! $venue) {
            abort(404, 'Venue not found');
        }

        $milestones = $venue->rewards()
            ->where('active', true)
            ->where('reward_type', 'milestone')
            ->orderBy('required_stamps')
            ->orderBy('sort_order')
            ->limit(3)
            ->get(['id', 'title', 'description', 'image', 'image_thumb', 'required_stamps']);

        return response()->json([
            'venue' => [
                'id' => $venue->id,
                'name' => $venue->name,
                'slug' => $venue->slug,
                'category' => $venue->category,
                'logo' => $venue->logo,
                'logo_thumb' => $venue->logo_thumb,
                'cover_image' => $venue->cover_image,
                'address' => $venue->address,
            ],
            'milestones' => $milestones,
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        return response()->json([
            'venue' => $request->user()->activeVenue,
        ]);
    }

    public function customers(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        return response()->json([
            'customers' => $venue->customers()
                ->with('user:id,name,email')
                ->withCount('visits')
                ->orderByDesc('stamps')
                ->get(),
        ]);
    }

    public function show(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        return response()->json([
            'venue' => $venue->loadCount(['customers', 'visits', 'rewards']),
        ]);
    }

    public function store(StoreRestaurantRequest $request): JsonResponse
    {
        $user = $request->user();

        $venue = Venue::create([
            'name' => $request->string('name')->toString(),
            'slug' => $request->filled('slug')
                ? $request->string('slug')->toString()
                : Str::slug($request->string('name')->toString()).'-'.Str::lower(Str::random(5)),
            'category' => $request->string('category')->toString() ?: 'cafe',
            'logo' => null,
            'logo_thumb' => null,
            'cover_image' => null,
            'address' => $request->string('address')->toString() ?: null,
            'phone' => $request->string('phone')->toString() ?: null,
            'website' => $request->string('website')->toString() ?: null,
        ]);

        VenueUser::create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $user->forceFill([
            'active_venue_id' => $venue->id,
        ])->save();

        return response()->json([
            'venue' => $venue,
        ], 201);
    }

    public function update(StoreRestaurantRequest $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $venue->update([
            'name' => $request->string('name')->toString(),
            'slug' => $request->filled('slug')
                ? $request->string('slug')->toString()
                : $venue->slug,
            'category' => $request->filled('category')
                ? $request->string('category')->toString()
                : $venue->category,
            'address' => $request->string('address')->toString() ?: null,
            'phone' => $request->string('phone')->toString() ?: null,
            'website' => $request->string('website')->toString() ?: null,
        ]);

        return response()->json([
            'venue' => $venue->fresh()->loadCount(['customers', 'visits', 'rewards']),
        ]);
    }

    public function uploadLogo(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $request->validate([
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        $this->deleteLocalLogo($venue);

        $file = $request->file('logo');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'png');
        $filename = Str::slug($venue->slug).'-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-logos');

        File::ensureDirectoryExists($directory);
        $file->move($directory, $filename);

        $venue->forceFill([
            'logo' => "/uploads/venue-logos/{$filename}",
        ])->save();

        return response()->json([
            'venue' => $venue->fresh()->loadCount(['customers', 'visits', 'rewards']),
        ]);
    }

    public function destroyLogo(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $this->deleteLocalLogo($venue);

        $venue->forceFill([
            'logo' => null,
            'logo_thumb' => null,
        ])->save();

        return response()->json([
            'venue' => $venue->fresh()->loadCount(['customers', 'visits', 'rewards']),
        ]);
    }

    public function uploadCover(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $request->validate([
            'cover' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        $this->deleteLocalCover($venue);

        $file = $request->file('cover');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $filename = Str::slug($venue->slug).'-cover-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-covers');

        File::ensureDirectoryExists($directory);
        $file->move($directory, $filename);

        $venue->forceFill([
            'cover_image' => "/uploads/venue-covers/{$filename}",
        ])->save();

        return response()->json([
            'venue' => $venue->fresh()->loadCount(['customers', 'visits', 'rewards']),
        ]);
    }

    public function destroyCover(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $this->deleteLocalCover($venue);

        $venue->forceFill([
            'cover_image' => null,
        ])->save();

        return response()->json([
            'venue' => $venue->fresh()->loadCount(['customers', 'visits', 'rewards']),
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

        $request->user()->forceFill([
            'active_venue_id' => $venue->id,
        ])->save();

        return response()->json([
            'venue' => $venue->loadCount(['customers', 'visits', 'rewards']),
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
    }

    private function deleteLocalCover(Venue $venue): void
    {
        if (! $venue->cover_image || ! str_starts_with($venue->cover_image, '/uploads/venue-covers/')) {
            return;
        }

        File::delete(public_path(ltrim($venue->cover_image, '/')));
    }
}

