<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRewardRequest;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\Venue;
use App\Services\RewardImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Support\AuditLog;
use App\Support\VenueAccess;

class RewardController extends Controller
{
    public function __construct(private RewardImageService $rewardImages) {}
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
            $payload = array_merge($payload, $this->rewardImages->store($request->file('image'), $venue));
        }

        $reward = $venue->rewards()->create($payload);

        AuditLog::loyalty('reward.created', $reward, $request->user(), 'success', [
            'status' => 'success',
            'required_stamps' => $reward->required_stamps,
        ]);

        return response()->json([
            'reward' => $reward,
        ], 201);
    }

    public function update(StoreRewardRequest $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        VenueAccess::requireBrandModel($venue, $reward);

        $payload = $request->validated();
        unset($payload['image']);
        $removeImage = (bool) ($payload['remove_image'] ?? false);
        unset($payload['remove_image']);
        unset($payload['image_thumb']);
        $payload['reward_type'] = 'milestone';
        $payload['sort_order'] = $payload['required_stamps'];

        $this->ensureUniqueMilestoneThreshold($venue, (int) $payload['required_stamps'], $reward->id);

        if ($removeImage) {
            $this->rewardImages->delete($reward);
            $payload['image'] = null;
            $payload['image_thumb'] = null;
        }

        if ($request->hasFile('image')) {
            $this->rewardImages->delete($reward);
            $payload = array_merge($payload, $this->rewardImages->store($request->file('image'), $venue, $reward));
        }

        $reward->update($payload);

        AuditLog::loyalty('reward.updated', $reward, $request->user(), 'success', ['status' => 'success']);

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
        VenueAccess::requireBrandModel($venue, $reward);

        $reward->update(['active' => false]);

        AuditLog::loyalty('reward.archived', $reward, $request->user(), 'success', ['status' => 'success']);

        return response()->json([
            'reward' => $reward->fresh(),
        ]);
    }

    public function reactivate(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        VenueAccess::requireBrandModel($venue, $reward);

        $reward->update(['active' => true]);

        AuditLog::loyalty('reward.reactivated', $reward, $request->user(), 'success', ['status' => 'success']);

        return response()->json([
            'reward' => $reward->fresh(),
        ]);
    }

    public function purge(Request $request, Venue $venue, Reward $reward): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        VenueAccess::requireBrandModel($venue, $reward);

        if ($reward->active) {
            throw ValidationException::withMessages([
                'reward' => ['Archive this milestone before deleting it permanently.'],
            ]);
        }

        $pendingUnlockCount = RewardUnlock::query()
            ->where('reward_id', $reward->id)
            ->whereNull('claimed_at')
            ->count();

        if ($pendingUnlockCount > 0) {
            throw ValidationException::withMessages([
                'reward' => ["This milestone still has {$pendingUnlockCount} unclaimed customer reward(s). Customers must redeem them before permanent deletion."],
            ]);
        }

        $this->rewardImages->delete($reward);

        AuditLog::loyalty('reward.purged', $reward, $request->user(), 'success', [
            'status' => 'success',
            'reward_id' => $reward->id,
            'title' => $reward->title,
        ]);

        $reward->delete();

        return response()->json(status: 204);
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
