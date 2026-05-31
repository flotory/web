<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
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
        User::query()->create([
            'name' => 'Grace Hopper',
            'email' => 'grace@example.com',
            'password' => 'password',
            'is_admin' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'grace@example.com',
            'password' => 'password',
            'device_name' => 'phpunit',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.email', 'grace@example.com')
            ->assertJsonStructure(['user', 'token']);

        $this->assertDatabaseCount('personal_access_tokens', 1);
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
