<?php

namespace Tests\Feature;

use App\Enums\VenueStaffInvitationStatus;
use App\Mail\StaffInvitationMail;
use App\Models\VenueStaffInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueTeamControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_owner_can_list_team_members_and_invitations(): void
    {
        $owner = $this->createUser(['name' => 'Owner', 'email' => 'owner@example.com']);
        $staff = $this->createUser(['name' => 'Staff', 'email' => 'staff@example.com']);
        $venue = $this->createVenue(['name' => 'Demo Cafe']);

        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');

        $pending = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'pending@example.com',
            'role' => 'staff',
            'token' => 'pending-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'accepted@example.com',
            'role' => 'staff',
            'token' => 'accepted-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Accepted,
            'expires_at' => now()->addDays(3),
            'accepted_at' => now()->subDay(),
            'accepted_by_user_id' => $staff->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/venues/{$venue->id}/team");

        $response
            ->assertOk()
            ->assertJsonCount(2, 'members')
            ->assertJsonCount(1, 'pending_invitations')
            ->assertJsonCount(1, 'invitation_history')
            ->assertJsonPath('pending_invitations.0.email', $pending->email)
            ->assertJsonPath('members.0.role', 'owner')
            ->assertJsonPath('members.1.role', 'staff');
    }

    public function test_staff_cannot_access_team_management(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser();
        $venue = $this->createVenue();

        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');

        Sanctum::actingAs($staff);

        $this->getJson("/api/venues/{$venue->id}/team")->assertForbidden();
        $this->postJson("/api/venues/{$venue->id}/team/invite", [
            'email' => 'new@example.com',
        ])->assertForbidden();
    }

    public function test_owner_can_resend_pending_invitation(): void
    {
        Mail::fake();

        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'old-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/venues/{$venue->id}/team/invitations/{$invitation->id}/resend");

        $response
            ->assertOk()
            ->assertJsonPath('invitation.status', VenueStaffInvitationStatus::Pending->value);

        $invitation->refresh();

        $this->assertNotSame('old-token', $invitation->token);
        $this->assertTrue($invitation->expires_at->isFuture());
        Mail::assertSent(StaffInvitationMail::class, 1);
    }

    public function test_owner_can_cancel_pending_invitation(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'cancel-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/team/invitations/{$invitation->id}")
            ->assertOk()
            ->assertJsonPath('invitation.status', VenueStaffInvitationStatus::Cancelled->value);
    }

    public function test_owner_can_remove_staff_member(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();

        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');
        $staff->forceFill(['active_venue_id' => $venue->id])->save();

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/team/{$staff->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('venue_users', [
            'venue_id' => $venue->id,
            'user_id' => $staff->id,
        ]);

        $this->assertNull($staff->fresh()->active_venue_id);
    }

    public function test_owner_cannot_remove_themselves(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/team/{$owner->id}")
            ->assertStatus(422);
    }

    public function test_invite_rejects_existing_staff_member(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();

        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/team/invite", [
            'email' => 'staff@example.com',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_invite_rejects_venue_owner_email(): void
    {
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createVenue();

        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/team/invite", [
            'email' => 'owner@example.com',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_duplicate_invite_resends_existing_pending_invitation(): void
    {
        Mail::fake();

        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'original-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/team/invite", [
            'email' => 'staff@example.com',
        ])->assertCreated();

        $invitation->refresh();

        $this->assertNotSame('original-token', $invitation->token);
        $this->assertDatabaseCount('venue_staff_invitations', 1);
        Mail::assertSent(StaffInvitationMail::class, 1);
    }

    public function test_owner_can_update_staff_role(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');

        Sanctum::actingAs($owner);

        $this->patchJson("/api/venues/{$venue->id}/team/{$staff->id}", [
            'role' => 'staff',
        ])
            ->assertOk()
            ->assertJsonPath('member.role', 'staff')
            ->assertJsonPath('member.user.email', 'staff@example.com');
    }

    public function test_owner_cannot_change_their_own_role(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->patchJson("/api/venues/{$venue->id}/team/{$owner->id}", [
            'role' => 'staff',
        ])->assertStatus(422);
    }
}
