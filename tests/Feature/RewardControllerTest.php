<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
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

    public function test_owner_can_create_reward_with_image(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'image-reward']);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $response = $this->post("/api/venues/{$venue->id}/rewards", [
            'title' => 'Photo Reward',
            'required_stamps' => 3,
            'image' => UploadedFile::fake()->image('reward.jpg'),
        ], ['Accept' => 'application/json']);

        $response
            ->assertCreated()
            ->assertJsonPath('reward.image', fn (string $path): bool => str_starts_with($path, '/uploads/reward-milestones/'))
            ->assertJsonPath('reward.image_thumb', fn (?string $path): bool => is_string($path) && str_ends_with($path, '-thumb.jpg'));
    }

    public function test_owner_can_update_reward_and_replace_image(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'update-reward']);
        $this->attachMember($venue, $owner, 'owner');
        $reward = $this->createReward($venue, [
            'title' => 'Old Title',
            'required_stamps' => 5,
            'image' => '/uploads/reward-milestones/old.jpg',
        ]);

        $directory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($directory);
        File::put("{$directory}/old.jpg", 'old');

        Sanctum::actingAs($owner);

        $this->put("/api/venues/{$venue->id}/rewards/{$reward->id}", [
            'title' => 'Updated Title',
            'required_stamps' => 7,
            'remove_image' => true,
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('reward.title', 'Updated Title')
            ->assertJsonPath('reward.required_stamps', 7)
            ->assertJsonPath('reward.image', null);

        $this->put("/api/venues/{$venue->id}/rewards/{$reward->id}", [
            'title' => 'Updated Title',
            'required_stamps' => 7,
            'image' => UploadedFile::fake()->image('new-reward.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('reward.image', fn (string $path): bool => str_starts_with($path, '/uploads/reward-milestones/'));
    }

    public function test_owner_can_archive_reactivate_and_purge_reward(): void
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

        $this->deleteJson("/api/venues/{$venue->id}/rewards/{$reward->id}")
            ->assertOk()
            ->assertJsonPath('reward.active', false);

        $this->deleteJson("/api/venues/{$venue->id}/rewards/{$reward->id}/purge")
            ->assertNoContent();

        $this->assertDatabaseMissing('rewards', ['id' => $reward->id]);
    }

    public function test_purge_rejects_active_reward(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $reward = $this->createReward($venue);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/rewards/{$reward->id}/purge")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reward');
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

    public function test_update_rejects_duplicate_milestone_threshold(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $this->createReward($venue, ['required_stamps' => 5]);
        $reward = $this->createReward($venue, ['required_stamps' => 10]);

        Sanctum::actingAs($owner);

        $this->putJson("/api/venues/{$venue->id}/rewards/{$reward->id}", [
            'title' => 'Clashing Milestone',
            'required_stamps' => 5,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('required_stamps');
    }

    public function test_reward_actions_reject_mismatched_venue(): void
    {
        $owner = $this->createUser();
        $venueA = $this->createVenue();
        $venueB = $this->createVenue();
        $this->attachMember($venueA, $owner, 'owner');
        $this->attachMember($venueB, $owner, 'owner');
        $reward = $this->createReward($venueB);

        Sanctum::actingAs($owner);

        $this->putJson("/api/venues/{$venueA->id}/rewards/{$reward->id}", [
            'title' => 'Wrong Venue',
            'required_stamps' => 5,
        ])->assertNotFound();
    }

    public function test_create_reward_rejects_unsupported_image_extension(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'bad-image']);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->post("/api/venues/{$venue->id}/rewards", [
            'title' => 'Bad Image Reward',
            'required_stamps' => 4,
            'image' => UploadedFile::fake()->create('photo.heic', 100, 'image/heic'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');
    }
}

