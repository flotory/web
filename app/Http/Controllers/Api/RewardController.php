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
        $payload['reward_type'] = 'milestone';
        $payload['sort_order'] = $payload['required_stamps'];

        $this->ensureUniqueMilestoneThreshold($venue, (int) $payload['required_stamps']);

        if ($request->hasFile('image')) {
            $payload['image'] = $this->storeRewardImage($request->file('image'), $venue, null);
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
        $payload['reward_type'] = 'milestone';
        $payload['sort_order'] = $payload['required_stamps'];

        $this->ensureUniqueMilestoneThreshold($venue, (int) $payload['required_stamps'], $reward->id);

        if ($removeImage) {
            $this->deleteRewardImage($reward);
            $payload['image'] = null;
        }

        if ($request->hasFile('image')) {
            $this->deleteRewardImage($reward);
            $payload['image'] = $this->storeRewardImage($request->file('image'), $venue, $reward);
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

    private function storeRewardImage($file, Venue $venue, ?Reward $reward): string
    {
        $directory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($directory);

        $seed = $reward?->id ? "{$reward->id}-{$venue->slug}" : $venue->slug;
        $filename = Str::slug($seed).'-'.Str::lower(Str::random(12)).'.'.$file->extension();
        $file->move($directory, $filename);

        return "/uploads/reward-milestones/{$filename}";
    }

    private function deleteRewardImage(Reward $reward): void
    {
        if (! $reward->image || ! str_starts_with($reward->image, '/uploads/reward-milestones/')) {
            return;
        }

        File::delete(public_path(ltrim($reward->image, '/')));
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
}
