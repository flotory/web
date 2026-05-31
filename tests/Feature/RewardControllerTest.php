<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class RewardControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_owner_can_create_and_list_rewards(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/rewards", [
            'title' => 'Free Latte',
            'required_stamps' => 5,
            'description' => 'Any size.',
        ])
            ->assertCreated()
            ->assertJsonPath('reward.title', 'Free Latte')
            ->assertJsonPath('reward.required_stamps', 5);

        $this->getJson("/api/venues/{$venue->id}/rewards")
            ->assertOk()
            ->assertJsonCount(1, 'rewards')
            ->assertJsonPath('rewards.0.title', 'Free Latte');
    }

    public function test_owner_can_archive_and_reactivate_reward(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $reward = $this->createReward($venue, ['title' => 'Free Tea']);

        Sanctum::actingAs($owner);

        $this->patchJson("/api/venues/{$venue->id}/rewards/{$reward->id}/archive")
            ->assertOk()
            ->assertJsonPath('reward.active', false);

        $this->patchJson("/api/venues/{$venue->id}/rewards/{$reward->id}/reactivate")
            ->assertOk()
            ->assertJsonPath('reward.active', true);
    }

    public function test_staff_cannot_manage_rewards(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser();
        $venue = $this->createVenue();

        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');

        Sanctum::actingAs($staff);

        $this->getJson("/api/venues/{$venue->id}/rewards")->assertForbidden();
        $this->postJson("/api/venues/{$venue->id}/rewards", [
            'title' => 'Blocked Reward',
            'required_stamps' => 5,
        ])->assertForbidden();
    }

    public function test_owner_cannot_create_duplicate_milestone_threshold(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $this->createReward($venue, ['required_stamps' => 5]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/rewards", [
            'title' => 'Duplicate Milestone',
            'required_stamps' => 5,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('required_stamps');
    }
}
