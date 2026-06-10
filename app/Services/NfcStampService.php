<?php

namespace App\Services;

use App\Models\NfcTag;
use App\Models\StampEvent;
use App\Models\User;
use App\Support\AuditLog;
use Carbon\CarbonInterval;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class NfcStampService
{
    public function __construct(
        private LoyaltyStampService $loyalty,
        private CustomerEnrollmentService $enrollment,
        private VenuePublicationService $publication,
    ) {}

    public function resolveActiveTag(string $token): NfcTag
    {
        $normalized = strtolower(trim($token));

        $tag = NfcTag::query()
            ->with('venue')
            ->where('token', $normalized)
            ->first();

        if ($tag === null) {
            throw ValidationException::withMessages([
                'token' => 'This NFC tag is not available.',
            ]);
        }

        if (! $tag->active) {
            throw ValidationException::withMessages([
                'token' => 'This NFC stand is turned off. Ask the venue to reactivate it in admin.',
            ]);
        }

        return $tag;
    }

    /**
     * @return array<string, mixed>
     */
    public function presentTag(NfcTag $tag): array
    {
        $tag->loadMissing('venue');

        return [
            'token' => $tag->token,
            'label' => $tag->label,
            'tap_url' => $tag->tapUrl(config('app.frontend_url', config('app.url'))),
            'venue' => $tag->venue ? [
                'id' => $tag->venue->id,
                'name' => $tag->venue->name,
                'slug' => $tag->venue->slug,
                'logo' => $tag->venue->logo,
                'logo_thumb' => $tag->venue->logo_thumb,
            ] : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function presentStampResult(array $payload): array
    {
        $customer = $payload['customer'];
        $addedStamps = (int) ($payload['added_stamps'] ?? 1);
        $venueName = $customer->venue?->name ?? 'this venue';

        return [
            'scan_type' => 'nfc',
            'customer' => $customer,
            'venue' => $payload['venue'] ?? $customer->venue,
            'previous_stamps' => $payload['previous_stamps'],
            'added_stamps' => $addedStamps,
            'stamps' => $customer->stamps,
            'requested_stamps' => $payload['requested_stamps'] ?? 1,
            'stamp_multiplier' => $payload['stamp_multiplier'] ?? 1,
            'next_reward' => $payload['next_reward'],
            'available_rewards' => $payload['available_rewards'],
            'milestones' => $payload['milestones'],
            'current_cycle' => $payload['current_cycle'],
            'cycle_completed' => $payload['cycle_completed'],
            'journey' => [
                'current_cycle' => $payload['current_cycle'],
                'current_stamps' => $customer->stamps,
                'milestones' => $payload['milestones'],
                'next_milestone' => $payload['next_reward'],
            ],
            'joined_on_scan' => (bool) ($payload['joined_on_scan'] ?? false),
            'stamp_event_id' => $payload['stamp_event_id'] ?? null,
            'nfc_tag' => $payload['nfc_tag'] ?? null,
            'message' => $payload['cycle_completed'] ?? false
                ? "Cycle complete at {$venueName}!"
                : "+{$addedStamps} stamp".($addedStamps === 1 ? '' : 's')." added at {$venueName}.",
            'occurred_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function awardStampFromTap(User $user, NfcTag $tag): array
    {
        $tag->loadMissing('venue');
        $venue = $tag->venue;

        if ($venue === null) {
            throw ValidationException::withMessages([
                'token' => 'This NFC tag is not linked to a venue.',
            ]);
        }

        $this->publication->assertPublic($venue);
        $this->guardNfcRateLimits($user, $tag);

        $customer = $this->enrollment->findOrJoin($user, $venue, null, 'nfc_auto_join');
        $joinedOnScan = (bool) $customer->wasRecentlyCreated;

        return DB::transaction(function () use ($user, $tag, $venue, $customer, $joinedOnScan): array {
            $result = $this->loyalty->addStamp(
                $customer,
                $user,
                1,
                StampAwardContext::nfcTap(),
            );

            $stampEvent = StampEvent::query()->create([
                'user_id' => $user->id,
                'customer_id' => $customer->id,
                'venue_id' => $venue->id,
                'nfc_tag_id' => $tag->id,
            ]);

            AuditLog::loyalty('stamp.nfc_tap', $customer, $user, 'success', [
                'status' => 'success',
                'nfc_tag_id' => $tag->id,
                'stamp_event_id' => $stampEvent->id,
                'venue_id' => $venue->id,
            ]);

            return [
                ...$result,
                'scan_type' => 'nfc',
                'stamp_event_id' => $stampEvent->id,
                'joined_on_scan' => $joinedOnScan,
                'nfc_tag' => [
                    'id' => $tag->id,
                    'label' => $tag->label,
                ],
                'venue' => $venue,
            ];
        });
    }

    private function guardNfcRateLimits(User $user, NfcTag $tag): void
    {
        $debounceSeconds = max((int) config('loyalty.nfc.debounce_seconds', 2), 1);
        $windowSeconds = max((int) config('loyalty.nfc.window_seconds', 120), 1);
        $maxStamps = max((int) config('loyalty.nfc.max_stamps_per_window', 10), 1);

        $recentTap = StampEvent::query()
            ->where('user_id', $user->id)
            ->where('nfc_tag_id', $tag->id)
            ->where('created_at', '>=', now()->sub(CarbonInterval::seconds($debounceSeconds)))
            ->exists();

        if ($recentTap) {
            throw ValidationException::withMessages([
                'token' => 'Please wait a moment before tapping again.',
            ]);
        }

        $recentCount = StampEvent::query()
            ->where('user_id', $user->id)
            ->where('venue_id', $tag->venue_id)
            ->where('created_at', '>=', now()->sub(CarbonInterval::seconds($windowSeconds)))
            ->count();

        if ($recentCount >= $maxStamps) {
            throw ValidationException::withMessages([
                'token' => 'Too many NFC stamps in a short time. Please ask staff to scan your QR instead.',
            ]);
        }
    }
}
