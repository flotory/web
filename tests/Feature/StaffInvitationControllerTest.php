<?php

namespace Tests\Feature;

use App\Enums\VenueStaffInvitationStatus;
use App\Mail\StaffInvitationMail;
use App\Models\VenueStaffInvitation;
use App\Services\VenueStaffInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class StaffInvitationControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_owner_can_invite_staff_member(): void
    {
        Mail::fake();

        $owner = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createVenue(['name' => 'Demo Cafe']);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/venues/{$venue->id}/team/invite", [
            'email' => 'STAFF@Example.com',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('invitation.email', 'staff@example.com')
            ->assertJsonPath('invitation.role', 'staff');

        $invitation = VenueStaffInvitation::query()->firstOrFail();

        $this->assertSame(VenueStaffInvitationStatus::Pending, $invitation->status);
        $this->assertDatabaseHas('venue_staff_invitations', [
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
        ]);

        Mail::assertSent(StaffInvitationMail::class, 1);
    }

    public function test_invitation_show_endpoint_reports_valid_pending_invite(): void
    {
        $owner = $this->createUser(['name' => 'Venue Owner']);
        $venue = $this->createVenue(['name' => 'Demo Cafe', 'slug' => 'demo-cafe']);

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'invite-token-123',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        $response = $this->getJson("/api/invites/{$invitation->token}");

        $response
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('account_exists', false)
            ->assertJsonPath('invitation.email', 'staff@example.com')
            ->assertJsonPath('invitation.venue.slug', 'demo-cafe')
            ->assertJsonPath('invitation.inviter.name', 'Venue Owner');
    }

    public function test_register_endpoint_creates_user_and_accepts_invitation(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'newstaff@example.com',
            'role' => 'staff',
            'token' => 'register-invite-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        $response = $this->postJson("/api/invites/{$invitation->token}/register", [
            'name' => 'New Staff',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'newstaff@example.com')
            ->assertJsonPath('membership.role', 'staff')
            ->assertJsonPath('venue_id', $venue->id);

        $this->assertDatabaseHas('users', [
            'email' => 'newstaff@example.com',
            'active_venue_id' => $venue->id,
        ]);

        $this->assertDatabaseHas('venue_users', [
            'venue_id' => $venue->id,
            'role' => 'staff',
        ]);

        $this->assertDatabaseHas('venue_staff_invitations', [
            'id' => $invitation->id,
            'status' => VenueStaffInvitationStatus::Accepted->value,
        ]);
    }

    public function test_authenticated_matching_user_can_accept_invitation(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser([
            'email' => 'staff@example.com',
            'active_venue_id' => null,
        ]);
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'accept-invite-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        Sanctum::actingAs($staff);

        $this->postJson("/api/invites/{$invitation->token}/accept")
            ->assertOk()
            ->assertJsonPath('membership.user_id', $staff->id)
            ->assertJsonPath('membership.role', 'staff')
            ->assertJsonPath('venue_id', $venue->id);

        $this->assertDatabaseHas('venue_users', [
            'venue_id' => $venue->id,
            'user_id' => $staff->id,
            'role' => 'staff',
        ]);

        $this->assertDatabaseHas('venue_staff_invitations', [
            'id' => $invitation->id,
            'status' => VenueStaffInvitationStatus::Accepted->value,
            'accepted_by_user_id' => $staff->id,
        ]);
    }

    public function test_accept_rejects_authenticated_user_with_wrong_email(): void
    {
        $owner = $this->createUser();
        $wrongUser = $this->createUser(['email' => 'wrong@example.com']);
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'wrong-email-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        Sanctum::actingAs($wrongUser);

        $this->postJson("/api/invites/{$invitation->token}/accept")
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertDatabaseMissing('venue_users', [
            'venue_id' => $venue->id,
            'user_id' => $wrongUser->id,
        ]);
    }

    public function test_invitation_show_reports_pending_but_invalid_state(): void
    {
        $owner = $this->createUser(['name' => 'Venue Owner']);
        $venue = $this->createVenue(['name' => 'Demo Cafe', 'slug' => 'demo-cafe']);

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'stale-pending-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->subDay(),
        ]);

        $this->swap(VenueStaffInvitationService::class, new class extends VenueStaffInvitationService
        {
            public function syncExpiry(VenueStaffInvitation $invitation): void
            {
                // Keep stale pending rows as-is for defensive message coverage.
            }
        });

        $this->getJson("/api/invites/{$invitation->token}")
            ->assertOk()
            ->assertJsonPath('valid', false)
            ->assertJsonPath('message', 'This invitation is no longer valid.');
    }
}
