<?php

namespace Tests\Feature;

use App\Enums\VenueStaffInvitationStatus;
use App\Models\VenueStaffInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class StaffInvitationEdgeCaseTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_show_marks_expired_invitation_as_invalid(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'expired-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->subDay(),
        ]);

        $this->getJson("/api/invites/{$invitation->token}")
            ->assertOk()
            ->assertJsonPath('valid', false)
            ->assertJsonPath('invitation.status', VenueStaffInvitationStatus::Expired->value);
    }

    public function test_show_marks_cancelled_invitation_as_invalid(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'cancelled-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Cancelled,
            'expires_at' => now()->addDays(3),
        ]);

        $this->getJson("/api/invites/{$invitation->token}")
            ->assertOk()
            ->assertJsonPath('valid', false)
            ->assertJsonPath('message', 'This invitation was cancelled.');
    }

    public function test_register_rejects_when_account_already_exists(): void
    {
        $owner = $this->createUser();
        $existing = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'existing-user-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        $this->postJson("/api/invites/{$invitation->token}/register", [
            'name' => 'Staff User',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertSame($existing->id, $existing->fresh()->id);
        $this->assertDatabaseMissing('venue_users', [
            'venue_id' => $venue->id,
            'user_id' => $existing->id,
        ]);
    }

    public function test_resend_endpoint_rejects_accepted_invitation(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'accepted-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Accepted,
            'expires_at' => now()->addDays(3),
            'accepted_at' => now(),
            'accepted_by_user_id' => $staff->id,
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/team/invitations/{$invitation->id}/resend")
            ->assertStatus(422)
            ->assertJsonValidationErrors('invitation');
    }

    public function test_cancel_endpoint_rejects_non_pending_invitation(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'expired-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Expired,
            'expires_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/team/invitations/{$invitation->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('invitation');
    }

    public function test_invalid_invite_token_returns_not_found(): void
    {
        $this->getJson('/api/invites/not-a-real-token')
            ->assertNotFound()
            ->assertJsonPath('valid', false);
    }

    public function test_show_reports_authenticated_email_match(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'auth-show-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        Sanctum::actingAs($staff);

        $this->getJson("/api/invites/{$invitation->token}")
            ->assertOk()
            ->assertJsonPath('authenticated', true)
            ->assertJsonPath('email_matches', true)
            ->assertJsonPath('account_exists', true);
    }

    public function test_resend_endpoint_rejects_cancelled_invitation(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'cancelled-resend-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Cancelled,
            'expires_at' => now()->addDays(3),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/team/invitations/{$invitation->id}/resend")
            ->assertStatus(422)
            ->assertJsonValidationErrors('invitation');
    }

    public function test_owner_cannot_accept_staff_invitation_for_their_venue(): void
    {
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'owner@example.com',
            'role' => 'staff',
            'token' => 'owner-accept-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/invites/{$invitation->token}/accept")
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }
}
