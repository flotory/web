<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVenueBranchRequest;
use App\Models\Venue;
use App\Services\VenueBranchService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VenueBranchController extends Controller
{
    public function __construct(private VenueBranchService $branches) {}

    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        return response()->json([
            'branches' => $this->branches->listForBrand($venue),
        ]);
    }

    public function store(StoreVenueBranchRequest $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $branch = $this->branches->create($venue, $request->validated());

        return response()->json([
            'branch' => $branch,
        ], 201);
    }

    public function update(StoreVenueBranchRequest $request, Venue $venue, Venue $branch): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $updated = $this->branches->update($venue, $branch, [
            ...$request->validated(),
            'actor' => $request->user(),
        ]);

        return response()->json([
            'branch' => $updated,
        ]);
    }

    public function destroy(Request $request, Venue $venue, Venue $branch): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $this->branches->delete($venue, $branch);

        return response()->json(status: 204);
    }
}
