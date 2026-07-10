<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AdminVenueRewardControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_admin_can_create_list_and_update_rewards(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue(['slug' => 'admin-rewards-cafe']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/manage-venues/{$venue->id}/rewards", [
            'title' => 'Free Coffee',
            'required_stamps' => 5,
            'description' => 'Any size.',
            'active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('reward.title', 'Free Coffee')
            ->assertJsonPath('reward.required_stamps', 5);

        $this->getJson("/api/admin/manage-venues/{$venue->id}/rewards")
            ->assertOk()
            ->assertJsonCount(1, 'rewards')
            ->assertJsonPath('rewards.0.title', 'Free Coffee');

        $rewardId = $this->getJson("/api/admin/manage-venues/{$venue->id}/rewards")->json('rewards.0.id');

        $this->putJson("/api/admin/manage-venues/{$venue->id}/rewards/{$rewardId}", [
            'title' => 'Free Latte',
            'required_stamps' => 5,
            'description' => 'Updated.',
            'active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('reward.title', 'Free Latte');
    }

    public function test_admin_can_upload_reward_image(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser(['email' => 'admin-reward-owner@example.com']);
        $venue = $this->createVenue(['slug' => 'admin-reward-image']);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($admin);

        $this->post("/api/admin/manage-venues/{$venue->id}/rewards", [
            'title' => 'Photo Reward',
            'required_stamps' => 3,
            'active' => true,
            'image' => UploadedFile::fake()->image('reward.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('reward.image', fn (string $path): bool => str_starts_with($path, '/uploads/owners/'));
    }

    public function test_non_admin_cannot_manage_admin_rewards(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson("/api/admin/manage-venues/{$venue->id}/rewards")->assertForbidden();
        $this->postJson("/api/admin/manage-venues/{$venue->id}/rewards", [
            'title' => 'Blocked',
            'required_stamps' => 5,
            'active' => true,
        ])->assertForbidden();
    }
}
