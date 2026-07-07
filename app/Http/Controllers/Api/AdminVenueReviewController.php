<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Venue;
use App\Services\VenuePublicationService;
use App\Support\VenuePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVenueReviewController extends Controller
{
    public function __construct(private VenuePublicationService $publication) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString();

        $query = Venue::query()
            ->where('is_primary', true)
            ->when($request->boolean('include_archived'), fn ($builder) => $builder->withTrashed())
            ->with('brand')
            ->withCount([
                'rewards as active_rewards_count' => fn ($builder) => $builder->where('active', true),
                'customers',
                'setupFiles as setup_files_count',
            ])
            ->with([
                'memberships' => fn ($builder) => $builder
                    ->where('role', 'owner')
                    ->with('user:id,name,email'),
            ])
            ->latest('updated_at');

        if ($status !== '') {
            $query->whereHas('brand', fn ($brandQuery) => $brandQuery->where('status', $status));
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

    public function approve(Request $request, int $venue): JsonResponse
    {
        $venue = $this->publication->approve($this->resolveVenue($venue), $request->user());

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    public function reject(Request $request, int $venue): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $venue = $this->publication->reject(
            $this->resolveVenue($venue),
            $request->user(),
            $validated['note'] ?? null,
        );

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    public function unpublish(Request $request, int $venue): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $venue = $this->publication->unpublish(
            $this->resolveVenue($venue),
            $request->user(),
            $validated['note'] ?? null,
        );

        return response()->json([
            'venue' => $this->presentVenue($venue),
        ]);
    }

    private function resolveVenue(int $venueId): Venue
    {
        return Venue::query()->withTrashed()->with('brand')->findOrFail($venueId);
    }

    /**
     * @return array<string, mixed>
     */
    private function presentVenue(Venue $venue): array
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
            'cover_image' => $presented['cover_image'] ?? null,
            'status' => $presented['status'] ?? Brand::STATUS_DRAFT,
            'review_note' => $presented['review_note'] ?? null,
            'submitted_at' => $presented['submitted_at'] ?? null,
            'published_at' => $presented['published_at'] ?? null,
            'archived' => $venue->trashed(),
            'active_rewards_count' => $venue->active_rewards_count ?? 0,
            'customers_count' => $venue->customers_count ?? 0,
            'setup_files_count' => $venue->setup_files_count ?? 0,
            'final_logo_applied' => filled($presented['logo'] ?? null),
            'final_cover_applied' => filled($presented['cover_image'] ?? null),
            'owner' => $ownerMembership?->user ? [
                'id' => $ownerMembership->user->id,
                'name' => $ownerMembership->user->name,
                'email' => $ownerMembership->user->email,
            ] : null,
            'listing' => $this->publication->snapshot($venue),
        ];
    }
}
