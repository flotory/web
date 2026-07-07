<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use App\Services\VenueSetupFileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminVenueSetupFileController extends Controller
{
    public function __construct(private VenueSetupFileService $setupFiles) {}

    public function index(int $venue): JsonResponse
    {
        $venue = Venue::query()->withTrashed()->with('brand')->findOrFail($venue);
        $brand = $venue->brand;
        abort_if($brand === null, 404);

        $files = $venue->setupFiles()
            ->with('uploader:id,name,email')
            ->latest()
            ->get()
            ->map(fn (VenueSetupFile $file): array => $this->setupFiles->present($file));

        return response()->json([
            'files' => $files,
            'requirements' => [
                'files_uploaded' => $this->setupFiles->hasAnyFiles($brand),
                'file_count' => $this->setupFiles->fileCount($brand),
                'final_logo_applied' => filled($brand->logo),
                'final_cover_applied' => filled($brand->cover_image),
            ],
        ]);
    }

    public function store(Request $request, int $venue): JsonResponse
    {
        $venue = Venue::query()->withTrashed()->with('brand')->findOrFail($venue);
        abort_if($venue->brand === null, 404);

        $request->validate([
            'file' => ['required', 'file'],
        ]);

        $file = $this->setupFiles->store(
            $venue,
            $request->user(),
            $request->file('file'),
        )->load('uploader:id,name,email');

        return response()->json([
            'file' => $this->setupFiles->present($file),
        ], 201);
    }

    public function destroy(Request $request, int $venue, VenueSetupFile $setupFile): JsonResponse
    {
        $venue = Venue::query()->withTrashed()->with('brand')->findOrFail($venue);
        abort_if($venue->brand === null, 404);

        if ((int) $setupFile->brand_id !== (int) $venue->brand_id) {
            abort(404);
        }

        $this->setupFiles->delete($setupFile);

        return response()->json(status: 204);
    }
}
