<?php

namespace Tests\Unit;

use App\Enums\VenueStaffInvitationStatus;
use App\Mail\PasswordResetMail;
use App\Mail\StaffInvitationMail;
use App\Models\VenueStaffInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class MailTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_staff_invitation_mail_renders_expected_content(): void
    {
        $owner = $this->createUser(['name' => 'Venue Owner']);
        $venue = $this->createVenue(['name' => 'Demo Cafe']);

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'invite-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        $invitation->load(['venue', 'inviter']);

        $mail = new StaffInvitationMail($invitation, 'https://app.example.com/invite/token');

        $this->assertSame("You've been invited to join Demo Cafe on Flotory", $mail->envelope()->subject);
        $this->assertSame('mail.staff-invitation', $mail->content()->markdown);
        $this->assertSame('Venue Owner', $mail->content()->with['inviterName']);
        $this->assertSame('Demo Cafe', $mail->content()->with['venueName']);
        $this->assertStringContainsString('invite/token', $mail->render());
    }

    public function test_password_reset_mail_renders_expected_content(): void
    {
        $user = $this->createUser(['name' => 'Ada Lovelace']);

        $mail = new PasswordResetMail('https://app.example.com/reset-password?token=abc', $user);

        $this->assertSame('Reset your Flotory password', $mail->envelope()->subject);
        $this->assertSame('mail.password-reset', $mail->content()->markdown);
        $this->assertSame('Ada Lovelace', $mail->content()->with['userName']);
        $this->assertStringContainsString('reset-password?token=abc', $mail->render());
    }
}
