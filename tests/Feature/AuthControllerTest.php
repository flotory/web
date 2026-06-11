<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_register_creates_a_user_and_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'ada@example.com')
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'active_venue'],
                'token',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'ada@example.com',
            'name' => 'Ada Lovelace',
        ]);

        $user = User::query()->where('email', 'ada@example.com')->firstOrFail();

        $this->assertTrue(Hash::check('password', $user->password));
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_login_returns_a_token_for_valid_credentials(): void
    {
        $owner = $this->createUser(['email' => 'grace@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $response = $this->postJson('/api/auth/login', [
            'email' => 'grace@example.com',
            'password' => 'password',
            'device_name' => 'browser',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.email', 'grace@example.com')
            ->assertJsonStructure(['user', 'token']);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_web_login_rejects_customer_accounts(): void
    {
        $customer = $this->createUser(['email' => 'customer@example.com']);
        $venue = $this->createVenue();
        $this->createCustomer($venue, $customer);

        $this->postJson('/api/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password',
            'device_name' => 'browser',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_mobile_login_allows_customer_accounts(): void
    {
        $customer = $this->createUser(['email' => 'customer@example.com']);
        $venue = $this->createVenue();
        $this->createCustomer($venue, $customer);

        $this->postJson('/api/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password',
            'device_name' => 'flotory-mobile',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'customer@example.com');

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_web_login_allows_platform_admin(): void
    {
        $this->createUser(['email' => 'admin@flotory.com', 'is_admin' => true]);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@flotory.com',
            'password' => 'password',
            'device_name' => 'browser',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'admin@flotory.com');
    }

    public function test_web_login_allows_venue_owner(): void
    {
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $this->postJson('/api/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'password',
            'device_name' => 'browser',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'owner@example.com');
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::query()->create([
            'name' => 'Grace Hopper',
            'email' => 'grace@example.com',
            'password' => 'password',
            'is_admin' => false,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'grace@example.com',
            'password' => 'wrong-password',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_google_auth_creates_user_and_token(): void
    {
        config(['services.google.client_id' => 'test-google-client-id']);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'sub' => 'google-user-123',
                'email' => 'mobile.google@example.com',
                'email_verified' => 'true',
                'aud' => 'test-google-client-id',
                'name' => 'Mobile Google User',
                'picture' => 'https://example.com/avatar.jpg',
            ]),
        ]);

        $response = $this->postJson('/api/auth/google', [
            'id_token' => 'fake-google-id-token',
            'device_name' => 'phpunit',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.email', 'mobile.google@example.com')
            ->assertJsonPath('user.google_id', 'google-user-123')
            ->assertJsonStructure(['user', 'token']);

        $this->assertDatabaseHas('users', [
            'email' => 'mobile.google@example.com',
            'google_id' => 'google-user-123',
        ]);
    }

    public function test_google_auth_links_existing_email_user(): void
    {
        config(['services.google.client_id' => 'test-google-client-id']);

        User::query()->create([
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'password' => 'password',
            'is_admin' => false,
        ]);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'sub' => 'google-existing-456',
                'email' => 'existing@example.com',
                'email_verified' => 'true',
                'aud' => 'test-google-client-id',
                'name' => 'Existing User',
            ]),
        ]);

        $this->postJson('/api/auth/google', [
            'id_token' => 'fake-google-id-token',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'existing@example.com')
            ->assertJsonPath('user.google_id', 'google-existing-456');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_google_auth_rejects_invalid_token(): void
    {
        config(['services.google.client_id' => 'test-google-client-id']);

        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([], 400),
        ]);

        $this->postJson('/api/auth/google', [
            'id_token' => 'invalid-token',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('id_token');
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        User::query()->create([
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'password' => 'old-password',
            'is_admin' => false,
        ]);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'ada@example.com',
            'token' => 'invalid-token',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }
}
