<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use App\Services\VenueSetupFileService;
use Illuminate\Http\JsonResponse;

class AdminVenueSetupFileController extends Controller
{
    public function __construct(private VenueSetupFileService $setupFiles) {}

    public function index(int $venue): JsonResponse
    {
        $venue = Venue::query()->withTrashed()->findOrFail($venue);

        $files = $venue->setupFiles()
            ->with('uploader:id,name,email')
            ->latest()
            ->get()
            ->map(fn (VenueSetupFile $file): array => $this->setupFiles->present($file));

        return response()->json([
            'files' => $files,
            'requirements' => [
                'files_uploaded' => $this->setupFiles->hasAnyFiles($venue),
                'file_count' => $this->setupFiles->fileCount($venue),
                'final_logo_applied' => filled($venue->logo),
                'final_cover_applied' => filled($venue->cover_image),
            ],
        ]);
    }
}
