<?php

namespace Tests\Feature;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_reset_email_for_existing_user(): void
    {
        Mail::fake();

        User::query()->create([
            'name' => 'Grace Hopper',
            'email' => 'grace@example.com',
            'password' => 'password',
            'is_admin' => false,
        ]);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'grace@example.com',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'If that email is registered, we sent a password reset link.');

        Mail::assertSent(PasswordResetMail::class, function (PasswordResetMail $mail): bool {
            return $mail->hasTo('grace@example.com')
                && str_contains($mail->resetUrl, '/reset-password?')
                && str_contains($mail->resetUrl, 'token=')
                && str_contains($mail->resetUrl, 'email=');
        });
    }

    public function test_forgot_password_does_not_reveal_missing_accounts(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'missing@example.com',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'If that email is registered, we sent a password reset link.');

        Mail::assertNothingSent();
    }

    public function test_reset_password_updates_credentials(): void
    {
        $user = User::query()->create([
            'name' => 'Ada Lovelace',
            'email' => 'ada@example.com',
            'password' => 'old-password',
            'is_admin' => false,
        ]);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'ada@example.com',
            'token' => $token,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Your password has been reset. You can sign in now.');

        $user->refresh();

        $this->assertTrue(Hash::check('new-password-123', $user->password));
    }
}
