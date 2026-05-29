<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRewardRequest;
use App\Models\Venue;
use App\Models\Reward;
use Illuminate\Support\Facades\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Support\VenueAccess;

class RewardController extends Controller
{
    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        return response()->json([
            'rewards' => $venue->rewards()->orderBy('required_stamps')->orderBy('sort_order')->get(),
        ]);
    }

    public function store(StoreRewardRequest $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

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
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
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
            $payload['image_thumb'] = null;
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
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        abort_unless($reward->venue_id === $venue->id, 404);

        $reward->update(['active' => false]);

        return response()->json([
            'reward' => $reward->fresh(),
        ]);
    }

    public function reactivate(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        abort_unless($reward->venue_id === $venue->id, 404);

        $reward->update(['active' => true]);

        return response()->json([
            'reward' => $reward->fresh(),
        ]);
    }

    public function purge(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        abort_unless($reward->venue_id === $venue->id, 404);

        if ($reward->active) {
            throw ValidationException::withMessages([
                'reward' => ['Archive this milestone before deleting it permanently.'],
            ]);
        }

        $this->deleteRewardImage($reward);
        $reward->delete();

        return response()->json(status: 204);
    }

    private function storeRewardImage($file, Venue $venue, ?Reward $reward): array
    {
        $directory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($directory);

        if (! is_writable($directory)) {
            throw ValidationException::withMessages([
                'image' => ['Upload folder is not writable on the server. Please contact support.'],
            ]);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (! in_array($extension, $allowed, true)) {
            throw ValidationException::withMessages([
                'image' => ['Use JPG, PNG, WEBP, or GIF. iPhone HEIC photos are not supported — choose Most Compatible in Camera settings.'],
            ]);
        }

        $seed = $reward?->id ? "{$reward->id}-{$venue->slug}" : $venue->slug;
        $filename = Str::slug($seed).'-'.Str::lower(Str::random(12)).'.'.$extension;

        try {
            $file->move($directory, $filename);
        } catch (\Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'image' => ['The image could not be saved. Try a smaller JPG or PNG under 5 MB.'],
            ]);
        }

        $path = "/uploads/reward-milestones/{$filename}";

        return [
            'image' => $path,
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
                'required_stamps' => ['A milestone already exists for this stamp threshold.'],
            ]);
        }
    }
}
