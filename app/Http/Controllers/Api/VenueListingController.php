<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Services\VenuePublicationService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VenueListingController extends Controller
{
    public function __construct(private VenuePublicationService $publication) {}

    public function show(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        return response()->json([
            'venue_id' => $venue->id,
            'listing' => $this->publication->snapshot($venue),
        ]);
    }

    public function submit(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $venue = $this->publication->submitForReview($venue, $request->user());

        return response()->json([
            'venue' => $venue,
            'listing' => $this->publication->snapshot($venue),
        ]);
    }
}
