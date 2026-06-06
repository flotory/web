<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Services\VenuePublicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVenueReviewController extends Controller
{
    public function __construct(private VenuePublicationService $publication) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString();

        $query = Venue::query()
            ->withTrashed()
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

        if ($status !== '') {
            $query->where('status', $status);
        }

        $venues = $query->paginate(20);

        return response()->json([
            'venues' => collect($venues->items())
                ->map(fn (Venue $venue): array => $this->presentVenue($venue))
                ->values(),
            'meta' => [
                'current_page' => $venues->currentPage(),
                'last_page' => $venues->lastPage(),
                'total' => $venues->total(),
            ],
        ]);
    }

    public function approve(Request $request, Venue $venue): JsonResponse
    {
        $venue = $this->publication->approve($venue, $request->user());

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    public function reject(Request $request, Venue $venue): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $venue = $this->publication->reject(
            $venue,
            $request->user(),
            $validated['note'] ?? null,
        );

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    public function unpublish(Request $request, Venue $venue): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $venue = $this->publication->unpublish(
            $venue,
            $request->user(),
            $validated['note'] ?? null,
        );

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function presentVenue(Venue $venue): array
    {
        $ownerMembership = $venue->memberships->first();

        return [
            'id' => $venue->id,
            'name' => $venue->name,
            'slug' => $venue->slug,
            'category' => $venue->category,
            'address' => $venue->address,
            'logo' => $venue->logo,
            'cover_image' => $venue->cover_image,
            'status' => $venue->status,
            'review_note' => $venue->review_note,
            'submitted_at' => $venue->submitted_at?->toIso8601String(),
            'published_at' => $venue->published_at?->toIso8601String(),
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
}
