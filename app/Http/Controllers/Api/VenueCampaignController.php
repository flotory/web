<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\CampaignNotificationJob;
use App\Models\Campaign;
use App\Models\Venue;
use App\Services\CampaignService;
use App\Support\CampaignTemplates;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VenueCampaignController extends Controller
{
    public function __construct(private CampaignService $campaigns) {}

    public function templates(Request $request): JsonResponse
    {
        $venueId = $request->integer('venue_id');
        if (! $venueId) {
            return response()->json([
                'templates' => CampaignTemplates::catalog(),
            ]);
        }

        $venue = Venue::query()->findOrFail($venueId);
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        return response()->json([
            'templates' => $this->campaigns->templatesForVenue($venue),
            'recommendations' => $this->campaigns->recommendationsFor($venue),
            'active_campaigns' => $this->campaigns->ownerActiveCampaignsFor($venue),
        ]);
    }

    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $campaigns = $venue->campaigns()
            ->latest()
            ->get()
            ->map(fn (Campaign $campaign): array => $this->campaigns->enrichForOwner($campaign));

        return response()->json([
            'campaigns' => $campaigns,
            'recommendations' => $this->campaigns->recommendationsFor($venue),
            'active_campaigns' => $this->campaigns->ownerActiveCampaignsFor($venue),
            'templates' => $this->campaigns->templatesForVenue($venue),
        ]);
    }

    public function preview(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $this->validateCampaignPayload($request);

        return response()->json([
            'preview' => $this->campaigns->previewFor(
                $venue,
                $validated['template_id'],
                $validated['config'] ?? [],
                $validated['name'] ?? null,
            ),
        ]);
    }

    public function store(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $this->validateCampaignPayload($request);

        $campaign = $this->campaigns->createCampaign(
            $venue,
            $validated['template_id'],
            $validated['config'] ?? [],
            $request->user()->id,
            $validated['name'] ?? null,
            $validated['push_enabled'] ?? true,
        );

        if ($request->boolean('activate')) {
            $campaign = $this->campaigns->activate($campaign);
            if ($campaign->push_enabled) {
                CampaignNotificationJob::dispatch($campaign);
            }
        }

        return response()->json([
            'campaign' => $this->campaigns->enrichForOwner($campaign->fresh()),
        ], 201);
    }

    public function update(Request $request, Venue $venue, Campaign $campaign): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        $this->assertCampaignBelongsToVenue($campaign, $venue);

        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in([
                Campaign::STATUS_DRAFT,
                Campaign::STATUS_ACTIVE,
                Campaign::STATUS_PAUSED,
                Campaign::STATUS_ENDED,
            ])],
            'name' => ['sometimes', 'string', 'max:120'],
            'push_enabled' => ['sometimes', 'boolean'],
            'config' => ['sometimes', 'array'],
        ]);

        if (isset($validated['config']) || array_key_exists('name', $validated) || array_key_exists('push_enabled', $validated)) {
            $campaign = $this->campaigns->updateCampaignConfig(
                $campaign,
                $validated['config'] ?? [],
                $validated['name'] ?? null,
                $validated['push_enabled'] ?? null,
            );
        }

        $previousStatus = $campaign->status;

        if (($validated['status'] ?? null) === Campaign::STATUS_ACTIVE) {
            $campaign = $this->campaigns->activate($campaign);
            if ($previousStatus !== Campaign::STATUS_ACTIVE && $campaign->push_enabled) {
                CampaignNotificationJob::dispatch($campaign);
            }
        } elseif (isset($validated['status'])) {
            $updates = ['status' => $validated['status']];
            if ($validated['status'] === Campaign::STATUS_ENDED) {
                $updates['ends_at'] = $campaign->ends_at ?? now();
            }
            $campaign->update($updates);
            $campaign = $campaign->fresh();
        }

        return response()->json([
            'campaign' => $this->campaigns->enrichForOwner($campaign),
        ]);
    }

    public function destroy(Request $request, Venue $venue, Campaign $campaign): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        $this->assertCampaignBelongsToVenue($campaign, $venue);

        throw ValidationException::withMessages([
            'campaign' => 'Campaigns cannot be deleted. End the campaign to keep history.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateCampaignPayload(Request $request): array
    {
        $validated = $request->validate([
            'template_id' => ['required', 'string', Rule::in(CampaignTemplates::ids())],
            'name' => ['sometimes', 'string', 'max:120'],
            'activate' => ['sometimes', 'boolean'],
            'push_enabled' => ['sometimes', 'boolean'],
            'config' => ['sometimes', 'array'],
            'config.stamp_multiplier' => ['sometimes', 'integer', Rule::in([2, 3])],
            'config.inactive_days' => ['sometimes', 'integer', 'min:7', 'max:180'],
            'config.duration_days' => ['sometimes', 'integer', 'min:1', 'max:90'],
            'config.days_of_week' => ['sometimes', 'array'],
            'config.days_of_week.*' => ['integer', 'min:1', 'max:7'],
            'config.start_time' => ['sometimes', 'date_format:H:i'],
            'config.end_time' => ['sometimes', 'date_format:H:i'],
            'config.min_visits' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'config.min_rewards_claimed' => ['sometimes', 'integer', 'min:0', 'max:50'],
        ]);

        $templateId = $validated['template_id'];
        $defaults = CampaignTemplates::defaults($templateId);
        $config = array_merge($defaults['config'], $validated['config'] ?? []);
        $validated['config'] = $config;

        if ($templateId === CampaignTemplates::QUIET_DAY && empty($config['days_of_week'])) {
            throw ValidationException::withMessages([
                'config.days_of_week' => 'Choose at least one day to boost.',
            ]);
        }

        if ($templateId === CampaignTemplates::HAPPY_HOUR && empty($config['days_of_week'])) {
            throw ValidationException::withMessages([
                'config.days_of_week' => 'Choose at least one day for happy hour.',
            ]);
        }

        return $validated;
    }

    private function assertCampaignBelongsToVenue(Campaign $campaign, Venue $venue): void
    {
        if ($campaign->venue_id !== $venue->id) {
            abort(404);
        }
    }
}
