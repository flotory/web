<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AuthSessionControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_me_returns_the_authenticated_user_with_active_venue(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();

        $this->attachMember($venue, $user, 'owner');
        $user->forceFill(['active_venue_id' => $venue->id])->save();

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.active_venue.id', $venue->id);
    }

    public function test_authenticated_user_can_update_password(): void
    {
        $user = $this->createUser([
            'email' => 'password-owner@example.com',
            'password' => 'old-password',
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/auth/password', [
            'current_password' => 'old-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk()
            ->assertJsonPath('message', 'Password updated successfully.');

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_password_update_rejects_wrong_current_password(): void
    {
        $user = $this->createUser(['password' => 'secret-password']);

        Sanctum::actingAs($user);

        $this->putJson('/api/auth/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('current_password');

        $this->assertTrue(Hash::check('secret-password', $user->fresh()->password));
    }

    public function test_logout_revokes_the_current_access_token(): void
    {
        $user = $this->createUser();
        $plainTextToken = $user->createToken('phpunit')->plainTextToken;
        [, $tokenValue] = explode('|', $plainTextToken, 2);
        $token = PersonalAccessToken::findToken($tokenValue);

        Sanctum::actingAs($user, [], 'sanctum');
        $user->withAccessToken($token);

        $this->postJson('/api/auth/logout')
            ->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
