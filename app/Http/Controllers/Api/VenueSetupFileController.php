<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Models\Brand;
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

        $venue->loadMissing('brand');

        $files = $venue->setupFiles()
            ->with('uploader:id,name,email')
            ->latest()
            ->get()
            ->map(fn (VenueSetupFile $file): array => $this->setupFiles->present($file));

        return response()->json([
            'files' => $files,
            'requirements' => [
                'files_uploaded' => $this->setupFiles->hasAnyFiles($venue->brand),
                'file_count' => $this->setupFiles->fileCount($venue->brand),
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

        if ((int) $setupFile->brand_id !== (int) $venue->brand_id) {
            abort(404);
        }

        $venue->loadMissing('brand');

        if (in_array($venue->brand->status, [Brand::STATUS_PENDING_REVIEW, Brand::STATUS_PUBLISHED], true)) {
            $message = $venue->brand->status === Brand::STATUS_PUBLISHED
                ? 'Files cannot be removed while your venue is live. Contact Flotory support.'
                : 'Files cannot be removed while the venue is under review. Contact Flotory support.';

            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => $message,
            ]);
        }

        $this->setupFiles->delete($setupFile);

        return response()->json(status: 204);
    }
}
