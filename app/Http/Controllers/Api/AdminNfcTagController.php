<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NfcTag;
use App\Models\Venue;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNfcTagController extends Controller
{
    public function index(int $venue): JsonResponse
    {
        $venue = Venue::query()->withTrashed()->findOrFail($venue);

        $tags = NfcTag::query()
            ->where('venue_id', $venue->id)
            ->withCount('stampEvents')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (NfcTag $tag): array => $this->presentTag($tag))
            ->values();

        return response()->json([
            'venue_id' => $venue->id,
            'tags' => $tags,
        ]);
    }

    public function store(Request $request, int $venue): JsonResponse
    {
        $venue = Venue::query()->withTrashed()->findOrFail($venue);

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:120'],
        ]);

        $tag = NfcTag::query()->create([
            'venue_id' => $venue->id,
            'label' => $validated['label'] ?? null,
            'active' => true,
        ]);

        AuditLog::record(
            description: 'nfc_tag.created',
            subject: $tag,
            causer: $request->user(),
            event: 'created',
            properties: [
                'venue_id' => $venue->id,
                'nfc_tag_id' => $tag->id,
            ],
        );

        return response()->json([
            'tag' => $this->presentTag($tag->fresh()),
        ], 201);
    }

    public function update(Request $request, NfcTag $nfcTag): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['sometimes', 'nullable', 'string', 'max:120'],
            'active' => ['sometimes', 'boolean'],
            'regenerate_token' => ['sometimes', 'boolean'],
        ]);

        if ($request->boolean('regenerate_token')) {
            $nfcTag->token = NfcTag::generateUniqueToken();
        }

        if (array_key_exists('label', $validated)) {
            $nfcTag->label = $validated['label'];
        }

        if (array_key_exists('active', $validated)) {
            $nfcTag->active = (bool) $validated['active'];
        }

        $nfcTag->save();

        AuditLog::record(
            description: 'nfc_tag.updated',
            subject: $nfcTag,
            causer: $request->user(),
            event: 'updated',
            properties: [
                'venue_id' => $nfcTag->venue_id,
                'nfc_tag_id' => $nfcTag->id,
                'regenerated' => $request->boolean('regenerate_token'),
            ],
        );

        return response()->json([
            'tag' => $this->presentTag($nfcTag->fresh()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function presentTag(NfcTag $tag): array
    {
        return [
            'id' => $tag->id,
            'venue_id' => $tag->venue_id,
            'token' => $tag->token,
            'label' => $tag->label,
            'active' => $tag->active,
            'tap_url' => $tag->tapUrl(config('app.frontend_url', config('app.url'))),
            'stamp_events_count' => $tag->stamp_events_count ?? null,
            'created_at' => $tag->created_at?->toIso8601String(),
            'updated_at' => $tag->updated_at?->toIso8601String(),
        ];
    }
}
