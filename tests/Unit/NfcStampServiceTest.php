<?php

namespace Tests\Unit;

use App\Models\NfcTag;
use App\Models\StampEvent;
use App\Models\Venue;
use App\Services\NfcStampService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
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

            Carbon::setTestNow('2026-06-11 12:00:04');

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

            Carbon::setTestNow('2026-06-11 12:00:04');
            $service->awardStampFromTap($customerUser, $tag->fresh());

            $this->expectException(ValidationException::class);
            Carbon::setTestNow('2026-06-11 12:00:08');
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

    public function test_resolve_active_tag_rejects_unknown_token(): void
    {
        $this->expectException(ValidationException::class);

        try {
            app(NfcStampService::class)->resolveActiveTag('missing-token');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('token', $exception->errors());
            throw $exception;
        }
    }

    public function test_present_stamp_result_uses_cycle_complete_message(): void
    {
        $user = $this->createUser();
        $venue = $this->createPublishedVenue(['name' => 'Cycle Cafe']);
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $customer->setRelation('venue', $venue);

        $payload = app(NfcStampService::class)->presentStampResult([
            'customer' => $customer,
            'previous_stamps' => 9,
            'added_stamps' => 1,
            'stamp_multiplier' => 1,
            'next_reward' => null,
            'available_rewards' => new Collection(),
            'milestones' => collect(),
            'current_cycle' => 2,
            'cycle_completed' => true,
            'joined_on_scan' => false,
            'stamp_event_id' => 99,
            'nfc_tag' => ['id' => 1, 'label' => 'Counter'],
        ]);

        $this->assertSame('Cycle complete at Cycle Cafe!', $payload['message']);
    }

    public function test_present_stamp_result_includes_campaign_warning(): void
    {
        $user = $this->createUser();
        $venue = $this->createPublishedVenue(['name' => 'Warn Cafe']);
        $customer = $this->createCustomer($venue, $user, ['stamps' => 1]);
        $customer->setRelation('venue', $venue);
        $warning = 'Bonus stamps could not be applied right now.';

        $payload = app(NfcStampService::class)->presentStampResult([
            'customer' => $customer,
            'previous_stamps' => 0,
            'added_stamps' => 1,
            'stamp_multiplier' => 1,
            'next_reward' => null,
            'available_rewards' => new Collection(),
            'milestones' => collect(),
            'current_cycle' => 1,
            'cycle_completed' => false,
            'campaign_warning' => $warning,
            'joined_on_scan' => false,
        ]);

        $this->assertSame($warning, $payload['campaign_warning']);
    }

    public function test_award_stamp_from_tap_rejects_unpublished_venue(): void
    {
        $user = $this->createUser(['email' => 'draft-nfc@example.com']);
        $venue = $this->createVenue(['status' => Venue::STATUS_DRAFT]);
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);

        $this->expectException(ValidationException::class);

        app(NfcStampService::class)->awardStampFromTap($user, $tag);
    }
}
