<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRewardRequest;
use App\Models\Venue;
use App\Models\Reward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Support\VenueAccess;

class RewardController extends Controller
{
    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager', 'staff']);

        return response()->json([
            'rewards' => $venue->rewards()->orderBy('required_stamps')->get(),
        ]);
    }

    public function store(StoreRewardRequest $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);

        $reward = $venue->rewards()->create($request->validated());

        return response()->json([
            'reward' => $reward,
        ], 201);
    }

    public function update(StoreRewardRequest $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);
        abort_unless($reward->venue_id === $venue->id, 404);

        $reward->update($request->validated());

        return response()->json([
            'reward' => $reward,
        ]);
    }

    public function destroy(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);
        abort_unless($reward->venue_id === $venue->id, 404);

        $reward->update(['active' => false]);

        return response()->json(status: 204);
    }
}
