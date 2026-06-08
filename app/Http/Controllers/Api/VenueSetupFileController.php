<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use App\Services\VenueSetupFileService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class VenueSetupFileController extends Controller
{
    public function __construct(private VenueSetupFileService $setupFiles) {}

    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

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
            ],
        ]);
    }

    public function store(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

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

    public function destroy(Request $request, Venue $venue, VenueSetupFile $setupFile): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        if ($setupFile->venue_id !== $venue->id) {
            abort(404);
        }

        if (in_array($venue->status, [Venue::STATUS_PENDING_REVIEW, Venue::STATUS_PUBLISHED], true)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => 'Files cannot be removed while the venue is under review or live. Contact Flotory support.',
            ]);
        }

        $this->setupFiles->delete($setupFile);

        return response()->json(status: 204);
    }
}
