<?php

namespace Tests\Feature;

use App\Models\RewardUnlock;
use App\Support\CampaignTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

/**
 * Maps critical BUSINESS_RULES.md invariants to API-level assertions.
 */
class BusinessRulesComplianceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    /** @see BUSINESS_RULES L7 — stamps are not deducted on redeem */
    public function test_l7_redeem_does_not_change_stamp_balance(): void
    {
        $user = $this->createUser(['email' => 'l7@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);
        $unlock = $this->createRewardUnlock($customer, $reward);

        Sanctum::actingAs($user);

        $this->postJson("/api/customer/rewards/unlocks/{$unlock->id}/redeem")
            ->assertCreated()
            ->assertJsonPath('customer.stamps', 5)
            ->assertJsonPath('journey.current_stamps', 5);
    }

    /** @see BUSINESS_RULES L8 — overflow carries into next cycle */
    public function test_l8_overflow_carries_into_next_cycle_via_nfc(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-02 12:00:00'));

        try {
            $owner = $this->createUser();
            $user = $this->createUser(['email' => 'l8@example.com']);
            $venue = $this->createPublishedVenue();
            $this->attachMember($venue, $owner, 'owner');
            $tag = $this->createNfcTag($venue);
            $customer = $this->createCustomer($venue, $user, ['stamps' => 9]);
            $this->createReward($venue, ['required_stamps' => 10]);
            $this->createRewardCycle($customer);

            Sanctum::actingAs($owner);
            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
            ]);

            Sanctum::actingAs($user);
            $this->postJson("/api/nfc/t/{$tag->token}/stamp")
                ->assertCreated()
                ->assertJsonPath('added_stamps', 2)
                ->assertJsonPath('customer.stamps', 1)
                ->assertJsonPath('cycle_completed', true);
        } finally {
            Carbon::setTestNow();
        }
    }

    /** @see BUSINESS_RULES S5 — one visit per stamp award */
    public function test_s5_each_nfc_stamp_creates_exactly_one_visit(): void
    {
        $user = $this->createUser(['email' => 's5@example.com']);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $this->createReward($venue, ['required_stamps' => 10]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($user);

        Carbon::setTestNow('2026-06-11 12:00:00');
        try {
            $this->postJson("/api/nfc/t/{$tag->token}/stamp")->assertCreated();
            Carbon::setTestNow('2026-06-11 12:00:04');
            $this->postJson("/api/nfc/t/{$tag->token}/stamp")->assertCreated();

            $this->assertSame(2, $customer->fresh()->visits()->count());
        } finally {
            Carbon::setTestNow();
        }
    }

    /** @see BUSINESS_RULES S6 — duplicate tap within 3 seconds rejected */
    public function test_s6_duplicate_nfc_tap_within_three_seconds_rejected(): void
    {
        $user = $this->createUser(['email' => 's6@example.com']);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);
        $this->createReward($venue, ['required_stamps' => 10]);

        Sanctum::actingAs($user);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")->assertCreated();
        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    /** @see BUSINESS_RULES R9 / E2 — new lower milestone does not unlock until next stamp */
    public function test_r9_new_milestone_does_not_unlock_until_next_stamp(): void
    {
        $user = $this->createUser(['email' => 'r9@example.com']);
        $venue = $this->createVenue();
        $owner = $this->createUser(['email' => 'r9-owner@example.com']);
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $user, ['stamps' => 4]);
        $this->createReward($venue, ['required_stamps' => 10, 'sort_order' => 10]);
        $this->createRewardCycle($customer);

        Sanctum::actingAs($user);

        $this->getJson("/api/customers/{$customer->id}/card")
            ->assertJsonCount(0, 'pending_unlocks');

        Sanctum::actingAs($owner);
        $this->postJson("/api/venues/{$venue->id}/rewards", [
            'title' => 'Free Cookie',
            'required_stamps' => 3,
        ])->assertCreated();

        Sanctum::actingAs($user);
        $this->getJson("/api/customers/{$customer->id}/card")
            ->assertJsonCount(0, 'pending_unlocks');

        app(\App\Services\LoyaltyStampService::class)->addStamp($customer->fresh(), $user, 1);

        $this->getJson("/api/customers/{$customer->id}/card")
            ->assertJsonCount(1, 'pending_unlocks');
    }

    /** @see BUSINESS_RULES X2 — redeem consumes the specific unlock slid */
    public function test_x2_redeem_targets_specific_unlock_not_fifo(): void
    {
        $user = $this->createUser(['email' => 'x2@example.com']);
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user, ['stamps' => 0]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer, ['cycle_number' => 3, 'completed_at' => now()]);
        $older = $this->createRewardUnlock($customer, $reward, ['cycle_number' => 1]);
        $newer = $this->createRewardUnlock($customer, $reward, ['cycle_number' => 2]);

        Sanctum::actingAs($user);

        $this->postJson("/api/customer/rewards/unlocks/{$newer->id}/redeem")
            ->assertCreated()
            ->assertJsonPath('unlock.id', $newer->id);

        $this->assertNotNull($newer->fresh()->claimed_at);
        $this->assertNull($older->fresh()->claimed_at);
    }

    /** @see BUSINESS_RULES C3 — campaigns never stack; max multiplier wins */
    public function test_c3_campaign_multipliers_use_max_not_product(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-02 16:00:00'));

        try {
            $owner = $this->createUser();
            $guest = $this->createUser(['email' => 'c3@example.com']);
            $venue = $this->createPublishedVenue();
            $this->attachMember($venue, $owner, 'owner');
            $tag = $this->createNfcTag($venue);
            $customer = $this->createCustomer($venue, $guest, ['stamps' => 0]);
            $this->createReward($venue, ['required_stamps' => 20]);
            $this->createRewardCycle($customer);

            Sanctum::actingAs($owner);
            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::QUIET_DAY, [
                'stamp_multiplier' => 2,
                'days_of_week' => [2],
            ]);
            $this->seedActiveCampaign($venue, $owner, CampaignTemplates::HAPPY_HOUR, [
                'stamp_multiplier' => 3,
                'days_of_week' => [2],
                'start_time' => '15:00',
                'end_time' => '18:00',
            ]);

            Sanctum::actingAs($guest);
            $this->postJson("/api/nfc/t/{$tag->token}/stamp")
                ->assertCreated()
                ->assertJsonPath('added_stamps', 3)
                ->assertJsonPath('stamp_multiplier', 3);
        } finally {
            Carbon::setTestNow();
        }
    }

    /** @see BUSINESS_RULES R4 — purge blocked while unclaimed unlocks exist */
    public function test_r4_cannot_purge_reward_with_pending_unlocks(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'r4-guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $reward = $this->createReward($venue, ['required_stamps' => 5, 'active' => false]);
        $customer = $this->createCustomer($venue, $guest);
        $this->createRewardUnlock($customer, $reward);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/rewards/{$reward->id}/purge")
            ->assertStatus(422);

        $this->assertDatabaseHas('reward_unlocks', [
            'reward_id' => $reward->id,
            'claimed_at' => null,
        ]);
    }
}
