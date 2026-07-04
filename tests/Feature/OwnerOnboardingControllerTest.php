<?php

namespace Tests\Feature;

use App\Models\OwnerInvitation;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class OwnerOnboardingControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_returns_inactive_for_users_without_invitation_or_venue(): void
    {
        $user = $this->createUser(['email' => 'owner@example.com']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('active', false);
    }

    public function test_returns_inactive_for_platform_admin(): void
    {
        $admin = $this->createUser(['email' => 'admin@flotory.com', 'is_admin' => true]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('active', false);
    }

    public function test_returns_active_context_for_invited_owner_without_venue(): void
    {
        $user = $this->createUser(['email' => 'invited@example.com']);

        OwnerInvitation::query()->create([
            'email' => 'invited@example.com',
            'business_name' => 'Harbor Coffee',
            'token' => 'invite-token',
            'expires_at' => now()->addDay(),
            'accepted_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('active', true)
            ->assertJsonPath('business_name', 'Harbor Coffee')
            ->assertJsonPath('venue', null);
    }

    public function test_returns_listing_snapshot_for_draft_owner_venue(): void
    {
        $user = $this->createUser(['email' => 'draft@example.com']);

        OwnerInvitation::query()->create([
            'email' => 'draft@example.com',
            'business_name' => 'Draft Cafe',
            'token' => 'draft-token',
            'expires_at' => now()->addDay(),
            'accepted_at' => now(),
        ]);

        $venue = Venue::query()->create([
            'name' => 'Draft Cafe',
            'slug' => 'draft-cafe',
            'category' => 'cafe',
            'status' => Venue::STATUS_DRAFT,
        ]);

        VenueUser::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('active', true)
            ->assertJsonPath('venue.name', 'Draft Cafe')
            ->assertJsonPath('listing.status', 'draft')
            ->assertJsonCount(4, 'listing.items')
            ->assertJsonPath('listing.items.2.label', 'Logo & cover');
    }

    public function test_returns_active_for_rejected_venue(): void
    {
        $user = $this->createUser(['email' => 'rejected@example.com']);

        $venue = Venue::query()->create([
            'name' => 'Rejected Cafe',
            'slug' => 'rejected-cafe',
            'category' => 'cafe',
            'status' => Venue::STATUS_REJECTED,
            'review_note' => 'Please upload a clearer cover photo.',
        ]);

        VenueUser::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('active', true)
            ->assertJsonPath('venue.status', 'rejected')
            ->assertJsonPath('listing.review_note', 'Please upload a clearer cover photo.');
    }

    public function test_returns_inactive_for_pending_review_venue(): void
    {
        $user = $this->createUser(['email' => 'pending@example.com']);

        $venue = Venue::query()->create([
            'name' => 'Pending Cafe',
            'slug' => 'pending-cafe',
            'category' => 'cafe',
            'status' => Venue::STATUS_PENDING_REVIEW,
        ]);

        VenueUser::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('active', false);
    }
}
