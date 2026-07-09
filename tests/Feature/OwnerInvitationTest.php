<?php

namespace Tests\Feature;

use App\Mail\OwnerInvitationMail;
use App\Models\OwnerInvitation;
use App\Models\User;
use App\Models\BrandUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class OwnerInvitationTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_admin_can_send_owner_invitation_without_venue(): void
    {
        Mail::fake();

        $admin = $this->createUser(['is_admin' => true]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/owner-invitations', [
            'email' => 'Owner@Harbor.test',
            'business_name' => 'Harbor Coffee',
        ])
            ->assertCreated()
            ->assertJsonPath('invitation.email', 'owner@harbor.test')
            ->assertJsonPath('invitation.business_name', 'Harbor Coffee')
            ->assertJsonPath('invitation.status', 'pending')
            ->assertJsonPath('invitation.pipeline_stage', 'invited');

        $this->assertDatabaseHas('owner_invitations', [
            'brand_id' => null,
            'email' => 'owner@harbor.test',
            'business_name' => 'Harbor Coffee',
        ]);

        Mail::assertSent(OwnerInvitationMail::class, function (OwnerInvitationMail $mail): bool {
            return $mail->hasTo('owner@harbor.test')
                && str_contains($mail->registerUrl, '/register?invite=');
        });

        $this->assertStringContainsString(
            '/register?invite=',
            (string) $response->json('register_url'),
        );
    }

    public function test_public_show_returns_valid_invitation_preview(): void
    {
        $invitation = OwnerInvitation::query()->create([
            'email' => 'preview@example.com',
            'business_name' => 'Preview Cafe',
            'token' => 'preview-token-123',
            'expires_at' => now()->addDays(7),
        ]);

        $this->getJson('/api/public/owner-invitations/preview-token-123')
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('email', 'preview@example.com')
            ->assertJsonPath('business_name', 'Preview Cafe')
            ->assertJsonPath('venue', null);
    }

    public function test_owner_can_accept_invitation_without_venue_and_may_create_one(): void
    {
        $invitation = OwnerInvitation::query()->create([
            'email' => 'accepted-owner@example.com',
            'business_name' => 'Accepted Cafe',
            'token' => 'accept-token-123',
            'expires_at' => now()->addDays(3),
        ]);

        $response = $this->postJson('/api/public/owner-invitations/accept-token-123/accept', [
            'name' => 'Accepted Owner',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertCreated()
            ->assertJsonPath('user.email', 'accepted-owner@example.com');

        $user = User::query()->where('email', 'accepted-owner@example.com')->firstOrFail();

        $this->assertDatabaseMissing('brand_users', [
            'user_id' => $user->id,
        ]);

        $this->assertNotNull($invitation->fresh()->accepted_at);

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('capabilities.may_create_venue', true);

        $this->putJson('/api/owner-onboarding/draft', [
            'name' => 'Accepted Cafe',
            'category' => 'cafe',
            'address' => '1 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'google_place_id' => 'test-place-accepted',
            'reward' => [
                'title' => 'Free coffee',
                'description' => 'Welcome reward',
                'required_stamps' => 10,
            ],
        ])->assertOk();

        $file = \Illuminate\Http\UploadedFile::fake()->image('logo.png');
        $this->postJson('/api/owner-onboarding/draft/files', ['file' => $file])
            ->assertCreated();

        $this->postJson('/api/owner-onboarding/submit')
            ->assertOk()
            ->assertJsonPath('venue.name', 'Accepted Cafe')
            ->assertJsonPath('listing.status', 'pending_review');

        $this->assertDatabaseHas('owner_invitations', [
            'id' => $invitation->id,
            'brand_id' => $user->fresh()->activeVenue?->brand_id,
        ]);
    }

    public function test_owner_can_accept_venue_scoped_invitation(): void
    {
        $venue = $this->createVenue(['name' => 'Provisioned Cafe']);
        $invitation = OwnerInvitation::query()->create([
            'brand_id' => $venue->brand_id,
            'email' => 'provisioned-owner@example.com',
            'token' => 'provisioned-token',
            'expires_at' => now()->addDay(),
        ]);

        $this->postJson('/api/public/owner-invitations/provisioned-token/accept', [
            'name' => 'Provisioned Owner',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $user = User::query()->where('email', 'provisioned-owner@example.com')->firstOrFail();

        $this->assertDatabaseHas('brand_users', [
            'brand_id' => $venue->brand_id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('capabilities.may_create_venue', true);
    }

    public function test_existing_provisioned_owner_can_reset_password_via_invitation(): void
    {
        $owner = $this->createUser(['email' => 'provisioned@example.com', 'name' => 'Old Name']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $invitation = OwnerInvitation::query()->create([
            'brand_id' => $venue->brand_id,
            'email' => 'provisioned@example.com',
            'token' => 'provisioned-token',
            'expires_at' => now()->addDay(),
        ]);

        $this->postJson('/api/public/owner-invitations/provisioned-token/accept', [
            'name' => 'Updated Owner',
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ])->assertCreated();

        $owner->refresh();
        $this->assertSame('Updated Owner', $owner->name);
        $this->assertTrue(BrandUser::query()->where('brand_id', $venue->brand_id)->where('user_id', $owner->id)->exists());
        $this->assertNotNull($invitation->fresh()->accepted_at);
    }

    public function test_expired_invitation_is_not_accepted(): void
    {
        OwnerInvitation::query()->create([
            'email' => 'expired@example.com',
            'token' => 'expired-token',
            'expires_at' => now()->subDay(),
        ]);

        $this->postJson('/api/public/owner-invitations/expired-token/accept', [
            'name' => 'Expired Owner',
            'password' => 'password123',
            'password_confirmation' => 'password_confirmation',
        ])->assertUnprocessable();
    }

    public function test_admin_can_revoke_pending_invitation(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $invitation = OwnerInvitation::query()->create([
            'email' => 'revoke@example.com',
            'token' => 'revoke-token',
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/owner-invitations/{$invitation->id}")
            ->assertOk()
            ->assertJsonPath('invitation.status', 'revoked');

        $this->getJson('/api/public/owner-invitations/revoke-token')
            ->assertOk()
            ->assertJsonPath('valid', false)
            ->assertJsonPath('reason', 'revoked');
    }

    public function test_invited_owner_without_venue_may_log_in_on_web(): void
    {
        $user = $this->createUser([
            'email' => 'invited@example.com',
            'password' => bcrypt('password123'),
        ]);

        OwnerInvitation::query()->create([
            'email' => 'invited@example.com',
            'accepted_at' => now(),
            'token' => 'used-token',
            'expires_at' => now()->addDay(),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'invited@example.com',
            'password' => 'password123',
            'device_name' => 'browser',
        ])->assertOk();
    }

    public function test_resending_invite_revokes_prior_pending_invite(): void
    {
        Mail::fake();

        $admin = $this->createUser(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/owner-invitations', [
            'email' => 'resend@example.com',
        ])->assertCreated();

        $first = OwnerInvitation::query()->where('email', 'resend@example.com')->firstOrFail();

        $this->postJson('/api/admin/owner-invitations', [
            'email' => 'resend@example.com',
        ])->assertCreated();

        $this->assertNotNull($first->fresh()->revoked_at);
        $this->assertDatabaseHas('owner_invitations', [
            'email' => 'resend@example.com',
            'revoked_at' => null,
        ]);
    }

    public function test_non_admin_cannot_manage_owner_invitations(): void
    {
        $owner = $this->createUser();
        Sanctum::actingAs($owner);

        $this->getJson('/api/admin/owner-invitations')->assertForbidden();
        $this->postJson('/api/admin/owner-invitations', ['email' => 'blocked@example.com'])->assertForbidden();
    }

    public function test_cannot_invite_existing_venue_owner(): void
    {
        Mail::fake();

        $owner = $this->createUser(['email' => 'existing-owner@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $admin = $this->createUser(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/owner-invitations', [
            'email' => 'existing-owner@example.com',
        ])->assertUnprocessable();
    }

    public function test_cannot_invite_platform_admin(): void
    {
        Mail::fake();

        $this->createUser(['email' => 'admin@example.com', 'is_admin' => true]);
        $admin = $this->createUser(['is_admin' => true, 'email' => 'ops@example.com']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/owner-invitations', [
            'email' => 'admin@example.com',
        ])->assertUnprocessable();
    }

    public function test_accepted_invitation_cannot_be_accepted_again(): void
    {
        OwnerInvitation::query()->create([
            'email' => 'twice@example.com',
            'token' => 'used-twice-token',
            'expires_at' => now()->addDay(),
            'accepted_at' => now(),
        ]);

        $this->postJson('/api/public/owner-invitations/used-twice-token/accept', [
            'name' => 'Twice Owner',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable();
    }

    public function test_owner_can_create_additional_brand(): void
    {
        $user = $this->createUser(['email' => 'one-venue@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'First Cafe', 'slug' => 'first-cafe']);
        $this->attachMember($venue, $user, 'owner');

        OwnerInvitation::query()->create([
            'email' => 'one-venue@example.com',
            'accepted_at' => now(),
            'token' => 'accepted-one',
            'expires_at' => now()->addDay(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertJsonPath('capabilities.may_create_venue', true);

        $this->putJson('/api/owner-onboarding/draft', [
            'purpose' => 'additional_venue',
            'restart' => true,
            'name' => 'Second Cafe',
            'category' => 'cafe',
            'address' => '2 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'google_place_id' => 'second-cafe-place',
            'reward' => [
                'title' => 'Second reward',
                'description' => 'Bonus coffee',
                'required_stamps' => 8,
            ],
        ])->assertOk();

        $file = \Illuminate\Http\UploadedFile::fake()->image('cover.png');
        $this->postJson('/api/owner-onboarding/draft/files', ['file' => $file])
            ->assertCreated();

        $this->postJson('/api/owner-onboarding/submit')
            ->assertOk()
            ->assertJsonPath('venue.name', 'Second Cafe')
            ->assertJsonPath('listing.status', 'pending_review');

        $this->assertDatabaseCount('brands', 2);
        $this->assertSame(2, BrandUser::query()->where('user_id', $user->id)->where('role', 'owner')->count());
    }
}
