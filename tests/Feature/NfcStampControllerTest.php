<?php

namespace Tests\Feature;

use App\Models\NfcTag;
use App\Models\StampEvent;
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

            Carbon::setTestNow('2026-06-11 12:00:03');

            $this->postJson("/api/nfc/t/{$tag->token}/stamp")
                ->assertCreated()
                ->assertJsonPath('customer.stamps', 2);
        } finally {
            Carbon::setTestNow();
        }
    }
}
