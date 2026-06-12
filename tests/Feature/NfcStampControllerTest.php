<?php

namespace Tests\Feature;

use App\Models\NfcTag;
use App\Models\StampEvent;
use App\Models\Venue;
use App\Support\CampaignTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class NfcStampControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_public_can_resolve_active_nfc_tag(): void
    {
        $venue = $this->createPublishedVenue(['name' => 'NFC Demo Cafe']);
        $tag = $this->createNfcTag($venue, ['label' => 'Counter stand']);

        $this->getJson("/api/public/nfc/t/{$tag->token}")
            ->assertOk()
            ->assertJsonPath('venue.name', 'NFC Demo Cafe')
            ->assertJsonPath('label', 'Counter stand')
            ->assertJsonPath('token', $tag->token);
    }

    public function test_public_cannot_resolve_inactive_nfc_tag(): void
    {
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue, ['active' => false]);

        $this->getJson("/api/public/nfc/t/{$tag->token}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_authenticated_customer_can_collect_stamp_from_nfc_tap(): void
    {
        $customerUser = $this->createUser(['email' => 'nfc-guest@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'Tap Cafe']);
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertCreated()
            ->assertJsonPath('scan_type', 'nfc')
            ->assertJsonPath('added_stamps', 1)
            ->assertJsonPath('customer.stamps', 1)
            ->assertJsonPath('venue.name', 'Tap Cafe');

        $this->assertDatabaseHas('stamp_events', [
            'user_id' => $customerUser->id,
            'venue_id' => $venue->id,
            'nfc_tag_id' => $tag->id,
        ]);
    }

    public function test_nfc_stamp_requires_authentication(): void
    {
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertUnauthorized();
    }

    public function test_nfc_stamp_rejects_immediate_second_tap(): void
    {
        $customerUser = $this->createUser(['email' => 'nfc-repeat@example.com']);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")->assertCreated();

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');

        $this->assertSame(1, StampEvent::query()->where('user_id', $customerUser->id)->count());
    }

    public function test_nfc_stamp_rejects_stamp_at_soft_deleted_venue(): void
    {
        $customerUser = $this->createUser(['email' => 'nfc-deleted@example.com']);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);
        $venue->delete();

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertStatus(422)
            ->assertJsonValidationErrors('venue');
    }

    public function test_nfc_stamp_allows_second_tap_after_cooldown(): void
    {
        Carbon::setTestNow('2026-06-11 12:00:00');

        try {
            $customerUser = $this->createUser(['email' => 'nfc-cooldown@example.com']);
            $venue = $this->createPublishedVenue();
            $tag = $this->createNfcTag($venue);
            $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
            $this->createReward($venue, ['required_stamps' => 10]);
            $this->createRewardCycle($customer);

            Sanctum::actingAs($customerUser);

            $this->postJson("/api/nfc/t/{$tag->token}/stamp")->assertCreated();

            Carbon::setTestNow('2026-06-11 12:00:04');

            $this->postJson("/api/nfc/t/{$tag->token}/stamp")
                ->assertCreated()
                ->assertJsonPath('customer.stamps', 2);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_public_cannot_resolve_unknown_nfc_token(): void
    {
        $this->getJson('/api/public/nfc/t/not-a-real-token')
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_nfc_stamp_sets_joined_on_scan_on_first_tap(): void
    {
        $customerUser = $this->createUser(['email' => 'nfc-first-tap@example.com']);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertCreated()
            ->assertJsonPath('joined_on_scan', true)
            ->assertJsonPath('customer.stamps', 1);

        $this->assertDatabaseHas('customers', [
            'user_id' => $customerUser->id,
            'venue_id' => $venue->id,
            'stamps' => 1,
        ]);
    }

    public function test_nfc_stamp_rejects_unpublished_venue(): void
    {
        $customerUser = $this->createUser(['email' => 'nfc-draft@example.com']);
        $venue = $this->createVenue(['status' => Venue::STATUS_DRAFT]);
        $tag = $this->createNfcTag($venue);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertStatus(422)
            ->assertJsonValidationErrors('venue');
    }

    public function test_nfc_stamp_returns_full_stamp_payload_shape(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-02 16:00:00'));

        try {
            $owner = $this->createUser();
            $customerUser = $this->createUser(['email' => 'nfc-payload@example.com']);
            $venue = $this->createPublishedVenue();
            $this->attachMember($venue, $owner, 'owner');
            $tag = $this->createNfcTag($venue, ['label' => 'Front counter']);
            $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 1]);
            $this->createReward($venue, ['required_stamps' => 10]);
            $this->createRewardCycle($customer);

            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
            ]);

            Sanctum::actingAs($customerUser);

            $this->postJson("/api/nfc/t/{$tag->token}/stamp")
                ->assertCreated()
                ->assertJsonPath('added_stamps', 2)
                ->assertJsonPath('stamp_multiplier', 2)
                ->assertJsonStructure([
                    'scan_type',
                    'customer',
                    'venue',
                    'journey' => ['current_cycle', 'current_stamps', 'milestones', 'next_milestone'],
                    'milestones',
                    'stamp_event_id',
                    'nfc_tag' => ['id', 'label'],
                    'message',
                    'occurred_at',
                    'joined_on_scan',
                ])
                ->assertJsonPath('nfc_tag.label', 'Front counter')
                ->assertJsonPath('message', '+2 stamps added at '.$venue->name.'.');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_nfc_stamp_returns_cycle_complete_message(): void
    {
        $customerUser = $this->createUser(['email' => 'nfc-cycle@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'Finish Line Cafe']);
        $tag = $this->createNfcTag($venue);
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 9]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($customerUser);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertCreated()
            ->assertJsonPath('cycle_completed', true)
            ->assertJsonPath('message', 'Cycle complete at Finish Line Cafe!');
    }

    public function test_nfc_stamp_rejects_burst_limit_at_api_level(): void
    {
        Carbon::setTestNow('2026-06-11 12:00:00');

        try {
            config([
                'loyalty.nfc.max_stamps_per_window' => 2,
                'loyalty.nfc.window_seconds' => 120,
            ]);

            $customerUser = $this->createUser(['email' => 'nfc-burst@example.com']);
            $venue = $this->createPublishedVenue();
            $tag = $this->createNfcTag($venue);
            $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 0]);
            $this->createReward($venue, ['required_stamps' => 20]);
            $this->createRewardCycle($customer);

            Sanctum::actingAs($customerUser);

            $this->postJson("/api/nfc/t/{$tag->token}/stamp")->assertCreated();

            Carbon::setTestNow('2026-06-11 12:00:04');
            $this->postJson("/api/nfc/t/{$tag->token}/stamp")->assertCreated();

            Carbon::setTestNow('2026-06-11 12:00:08');
            $this->postJson("/api/nfc/t/{$tag->token}/stamp")
                ->assertStatus(422)
                ->assertJsonValidationErrors('token');
        } finally {
            Carbon::setTestNow();
        }
    }
}
