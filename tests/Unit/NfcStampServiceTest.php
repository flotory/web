<?php

namespace Tests\Unit;

use App\Models\NfcTag;
use App\Models\StampEvent;
use App\Services\NfcStampService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class NfcStampServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_nfc_tap_awards_one_stamp_and_logs_stamp_event(): void
    {
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'NFC Cafe']);
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);
        $service = app(NfcStampService::class);

        $result = $service->awardStampFromTap($customerUser, $tag);

        $this->assertSame('nfc', $result['scan_type']);
        $this->assertSame(1, $result['customer']->stamps);
        $this->assertSame(1, $result['added_stamps']);
        $this->assertSame(1, $result['stamp_multiplier']);
        $this->assertDatabaseHas('stamp_events', [
            'user_id' => $customerUser->id,
            'venue_id' => $venue->id,
            'nfc_tag_id' => $tag->id,
        ]);
        $this->assertDatabaseHas('visits', [
            'customer_id' => $result['customer']->id,
            'created_by' => null,
        ]);
    }

    public function test_nfc_tap_auto_joins_customer_on_first_tap(): void
    {
        $customerUser = $this->createUser(['email' => 'new-guest@example.com']);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);

        app(NfcStampService::class)->awardStampFromTap($customerUser, $tag);

        $this->assertDatabaseHas('customers', [
            'user_id' => $customerUser->id,
            'venue_id' => $venue->id,
            'stamps' => 1,
        ]);
    }

    public function test_nfc_tap_rejects_duplicate_tap_within_debounce_window(): void
    {
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);
        $service = app(NfcStampService::class);

        $service->awardStampFromTap($customerUser, $tag);

        $this->expectException(ValidationException::class);
        $service->awardStampFromTap($customerUser, $tag);
    }

    public function test_nfc_tap_allows_second_tap_after_cooldown(): void
    {
        Carbon::setTestNow('2026-06-11 12:00:00');

        try {
            $customerUser = $this->createUser(['email' => 'guest@example.com']);
            $venue = $this->createPublishedVenue();
            $tag = $this->createNfcTag($venue);
            $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
            $this->createReward($venue, ['required_stamps' => 10]);
            $this->createRewardCycle($customer);
            $service = app(NfcStampService::class);

            $service->awardStampFromTap($customerUser, $tag);

            Carbon::setTestNow('2026-06-11 12:00:03');

            $result = $service->awardStampFromTap($customerUser, $tag->fresh());

            $this->assertSame(2, $result['customer']->stamps);
            $this->assertSame(2, StampEvent::query()->where('user_id', $customerUser->id)->count());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_nfc_tap_rejects_burst_limit_within_window(): void
    {
        Carbon::setTestNow('2026-06-11 12:00:00');

        try {
            config([
                'loyalty.nfc.max_stamps_per_window' => 2,
                'loyalty.nfc.window_seconds' => 120,
            ]);

            $customerUser = $this->createUser(['email' => 'guest@example.com']);
            $venue = $this->createPublishedVenue();
            $tag = $this->createNfcTag($venue);
            $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
            $this->createReward($venue, ['required_stamps' => 20]);
            $this->createRewardCycle($customer);
            $service = app(NfcStampService::class);

            $service->awardStampFromTap($customerUser, $tag);

            Carbon::setTestNow('2026-06-11 12:00:03');
            $service->awardStampFromTap($customerUser, $tag->fresh());

            $this->expectException(ValidationException::class);
            Carbon::setTestNow('2026-06-11 12:00:06');
            $service->awardStampFromTap($customerUser, $tag->fresh());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_resolve_active_tag_rejects_inactive_tag(): void
    {
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue, ['active' => false]);

        $this->expectException(ValidationException::class);

        app(NfcStampService::class)->resolveActiveTag($tag->token);
    }
}
