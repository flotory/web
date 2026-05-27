<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRewardRequest;
use App\Models\Venue;
use App\Models\Reward;
use Illuminate\Support\Facades\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Support\VenueAccess;

class RewardController extends Controller
{
    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager', 'staff']);

        return response()->json([
            'rewards' => $venue->rewards()->orderBy('required_stamps')->orderBy('sort_order')->get(),
        ]);
    }

    public function store(StoreRewardRequest $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);

        $payload = $request->validated();
        unset($payload['image']);
        unset($payload['remove_image']);
        unset($payload['image_thumb']);
        $payload['reward_type'] = 'milestone';
        $payload['sort_order'] = $payload['required_stamps'];

        $this->ensureUniqueMilestoneThreshold($venue, (int) $payload['required_stamps']);

        if ($request->hasFile('image')) {
            $payload = array_merge($payload, $this->storeRewardImage($request->file('image'), $venue, null));
        }

        $reward = $venue->rewards()->create($payload);

        return response()->json([
            'reward' => $reward,
        ], 201);
    }

    public function update(StoreRewardRequest $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);
        abort_unless($reward->venue_id === $venue->id, 404);

        $payload = $request->validated();
        unset($payload['image']);
        $removeImage = (bool) ($payload['remove_image'] ?? false);
        unset($payload['remove_image']);
        unset($payload['image_thumb']);
        $payload['reward_type'] = 'milestone';
        $payload['sort_order'] = $payload['required_stamps'];

        $this->ensureUniqueMilestoneThreshold($venue, (int) $payload['required_stamps'], $reward->id);

        if ($removeImage) {
            $this->deleteRewardImage($reward);
            $payload['image'] = null;
            if ($this->hasImageThumbColumn()) {
                $payload['image_thumb'] = null;
            }
        }

        if ($request->hasFile('image')) {
            $this->deleteRewardImage($reward);
            $payload = array_merge($payload, $this->storeRewardImage($request->file('image'), $venue, $reward));
        }

        $reward->update($payload);

        return response()->json([
            'reward' => $reward,
        ]);
    }

    public function destroy(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        return $this->archive($request, $venue, $reward);
    }

    public function archive(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);
        abort_unless($reward->venue_id === $venue->id, 404);

        $reward->update(['active' => false]);

        return response()->json([
            'reward' => $reward->fresh(),
        ]);
    }

    public function reactivate(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);
        abort_unless($reward->venue_id === $venue->id, 404);

        $reward->update(['active' => true]);

        return response()->json([
            'reward' => $reward->fresh(),
        ]);
    }

    public function purge(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);
        abort_unless($reward->venue_id === $venue->id, 404);

        if ($reward->active) {
            throw ValidationException::withMessages([
                'reward' => ['Archive this milestone before deleting it permanently.'],
            ]);
        }

        $this->deleteRewardImage($reward);
        $reward->delete();

        return response()->noContent();
    }

    private function storeRewardImage($file, Venue $venue, ?Reward $reward): array
    {
        $directory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($directory);

        $seed = $reward?->id ? "{$reward->id}-{$venue->slug}" : $venue->slug;
        $base = Str::slug($seed).'-'.Str::lower(Str::random(12));

        // If GD is unavailable in runtime, store original safely without processing.
        if (! $this->canProcessImages()) {
            $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
            $filename = "{$base}.{$extension}";
            $file->move($directory, $filename);

            $path = "/uploads/reward-milestones/{$filename}";

            return [
                'image' => $path,
                ...($this->hasImageThumbColumn() ? ['image_thumb' => $path] : []),
            ];
        }

        $imagePath = $directory.'/'.$base.'.webp';
        $thumbPath = $directory.'/'.$base.'-thumb.webp';

        [$source, $mime] = $this->makeImageSource($file->getPathname());
        if (! $source) {
            throw ValidationException::withMessages([
                'image' => ['Unsupported image format. Use JPG, PNG, WEBP, or GIF.'],
            ]);
        }

        $this->writeWebpVariant($source, $imagePath, 1600, 82, $mime);
        $this->writeWebpVariant($source, $thumbPath, 480, 80, $mime);
        imagedestroy($source);

        return [
            'image' => "/uploads/reward-milestones/{$base}.webp",
            ...($this->hasImageThumbColumn() ? ['image_thumb' => "/uploads/reward-milestones/{$base}-thumb.webp"] : []),
        ];
    }

    private function deleteRewardImage(Reward $reward): void
    {
        foreach ([$reward->image, $reward->image_thumb ?? null] as $path) {
            if (! $path || ! str_starts_with($path, '/uploads/reward-milestones/')) {
                continue;
            }

            File::delete(public_path(ltrim($path, '/')));
        }
    }

    private function ensureUniqueMilestoneThreshold(Venue $venue, int $requiredStamps, ?int $ignoreRewardId = null): void
    {
        $query = $venue->rewards()
            ->where('required_stamps', $requiredStamps)
            ->where('reward_type', 'milestone');

        if ($ignoreRewardId !== null) {
            $query->where('id', '!=', $ignoreRewardId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'required_stamps' => ['A milestone already exists for this visits threshold.'],
            ]);
        }
    }

    private function makeImageSource(string $path): array
    {
        $meta = @getimagesize($path);
        $mime = $meta['mime'] ?? '';

        $source = match ($mime) {
            'image/jpeg' => \function_exists('imagecreatefromjpeg') ? @\imagecreatefromjpeg($path) : false,
            'image/png' => \function_exists('imagecreatefrompng') ? @\imagecreatefrompng($path) : false,
            'image/webp' => \function_exists('imagecreatefromwebp') ? @\imagecreatefromwebp($path) : false,
            'image/gif' => \function_exists('imagecreatefromgif') ? @\imagecreatefromgif($path) : false,
            default => false,
        };

        return [$source, $mime];
    }

    private function writeWebpVariant($source, string $targetPath, int $maxWidth, int $quality, string $mime): void
    {
        $width = \imagesx($source);
        $height = \imagesy($source);
        $targetWidth = min($width, $maxWidth);
        $targetHeight = (int) max(1, round(($height / $width) * $targetWidth));

        $canvas = \imagecreatetruecolor($targetWidth, $targetHeight);
        \imagealphablending($canvas, true);
        \imagesavealpha($canvas, true);

        if ($mime === 'image/png' || $mime === 'image/gif') {
            $transparent = \imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            \imagefill($canvas, 0, 0, $transparent);
        }

        \imagecopyresampled(
            $canvas,
            $source,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $width,
            $height,
        );

        \imagewebp($canvas, $targetPath, $quality);
        \imagedestroy($canvas);
    }

    private function canProcessImages(): bool
    {
        return \function_exists('imagecreatetruecolor')
            && \function_exists('imagecopyresampled')
            && \function_exists('imagewebp')
            && (\function_exists('imagecreatefromjpeg') || \function_exists('imagecreatefrompng') || \function_exists('imagecreatefromgif'));
    }

    private function hasImageThumbColumn(): bool
    {
        static $checked = null;

        if ($checked === null) {
            $checked = Schema::hasColumn('rewards', 'image_thumb');
        }

        return $checked;
    }
}
