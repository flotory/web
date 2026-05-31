<?php

namespace Tests\Unit;

use App\Enums\VenueStaffInvitationStatus;
use App\Models\VenueStaffInvitation;
use App\Services\VenueStaffInvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueStaffInvitationServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_invite_rejects_unsupported_role(): void
    {
        Mail::fake();

        $owner = $this->createUser();
        $venue = $this->createVenue();
        $service = app(VenueStaffInvitationService::class);

        $this->expectException(ValidationException::class);

        $service->invite($venue, $owner, 'staff@example.com', 'manager');
    }

    public function test_find_usable_by_token_rejects_invalid_token(): void
    {
        $service = app(VenueStaffInvitationService::class);

        $this->expectException(ValidationException::class);

        $service->findUsableByToken('missing-token');
    }

    public function test_find_usable_by_token_rejects_accepted_invitation(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'accepted-service-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Accepted,
            'expires_at' => now()->addDays(3),
            'accepted_at' => now(),
            'accepted_by_user_id' => $staff->id,
        ]);

        $service = app(VenueStaffInvitationService::class);

        $this->expectException(ValidationException::class);

        $service->findUsableByToken($invitation->token);
    }

    public function test_invite_url_uses_frontend_base(): void
    {
        config(['app.frontend_url' => 'https://app.example.com']);

        $owner = $this->createUser();
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'url-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(3),
        ]);

        $url = app(VenueStaffInvitationService::class)->inviteUrl($invitation);

        $this->assertSame('https://app.example.com/invite/url-token', $url);
    }

    public function test_accept_rejects_expired_invitation(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'expired-accept-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Expired,
            'expires_at' => now()->subDay(),
        ]);

        $service = app(VenueStaffInvitationService::class);

        $this->expectException(ValidationException::class);

        $service->accept($invitation, $staff);
    }

    public function test_find_usable_by_token_rejects_expired_invitation(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'expired-find-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->subDay(),
        ]);

        $service = app(VenueStaffInvitationService::class);

        $this->expectException(ValidationException::class);

        $service->findUsableByToken($invitation->token);
    }

    public function test_find_usable_by_token_reports_pending_but_invalid_state(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'pending-invalid-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->subDay(),
        ]);

        $service = new class extends VenueStaffInvitationService
        {
            public function syncExpiry(VenueStaffInvitation $invitation): void
            {
                // Keep stale pending rows as-is for defensive message coverage.
            }
        };

        try {
            $service->findUsableByToken($invitation->token);
            $this->fail('Expected validation exception for invalid pending invitation.');
        } catch (ValidationException $exception) {
            $this->assertSame(
                'This invitation is no longer valid.',
                $exception->errors()['token'][0],
            );
        }
    }

    public function test_accept_rejects_invitation_that_becomes_invalid_after_lock(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => 'staff@example.com',
            'role' => 'staff',
            'token' => 'race-accept-token',
            'invited_by' => $owner->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDay(),
        ]);

        $retrieved = 0;
        VenueStaffInvitation::retrieved(function (VenueStaffInvitation $model) use ($invitation, &$retrieved): void {
            if ($model->id !== $invitation->id) {
                return;
            }

            $retrieved++;

            if ($retrieved === 1) {
                $model->forceFill([
                    'status' => VenueStaffInvitationStatus::Cancelled,
                ]);
            }
        });

        $service = app(VenueStaffInvitationService::class);

        try {
            $service->accept($invitation, $staff);
            $this->fail('Expected validation exception after invitation lock.');
        } catch (ValidationException $exception) {
            $this->assertSame(
                'This invitation is no longer valid.',
                $exception->errors()['token'][0],
            );
        }
    }
}
