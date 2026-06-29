<?php

namespace Tests\Feature;

use App\Models\OwnerInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class GoogleAuthControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    public function test_redirect_stores_intent_and_redirects_to_google(): void
    {
        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('redirect')
            ->once()
            ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

        $response = $this->get('/auth/google/redirect?venue_slug=demo-cafe&redirect=/card&intent=owner');

        $response->assertRedirect('https://accounts.google.com/o/oauth2/auth');
        $this->assertSame([
            'venue_slug' => 'demo-cafe',
            'redirect' => '/card',
            'intent' => 'owner',
            'mobile' => false,
        ], session('google_auth.intent'));
    }

    public function test_callback_redirects_new_owner_intent_to_book_demo_without_creating_user(): void
    {
        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-123');
        $googleUser->shouldReceive('getName')->andReturn('Google User');
        $googleUser->shouldReceive('getEmail')->andReturn('google@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.jpg');

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andReturn($googleUser);

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'venue_slug' => 'demo-cafe',
                    'redirect' => '/card',
                    'intent' => 'owner',
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('/book-demo', $response->headers->get('Location'));
        $this->assertStringNotContainsString('oauth_token=', $response->headers->get('Location'));

        $this->assertDatabaseMissing('users', [
            'email' => 'google@example.com',
        ]);
    }

    public function test_callback_logs_in_existing_owner_with_membership(): void
    {
        $owner = $this->createUser(['email' => 'google-owner@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-owner-123');
        $googleUser->shouldReceive('getName')->andReturn('Google Owner');
        $googleUser->shouldReceive('getEmail')->andReturn('google-owner@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn(null);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andReturn($googleUser);

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'intent' => 'owner',
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('oauth_token=', $response->headers->get('Location'));
    }

    public function test_callback_logs_in_invited_owner_without_membership(): void
    {
        $invited = $this->createUser(['email' => 'invited-google@example.com']);

        OwnerInvitation::query()->create([
            'email' => 'invited-google@example.com',
            'accepted_at' => now(),
            'token' => 'google-invite-token',
            'expires_at' => now()->addDay(),
        ]);

        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-invited-123');
        $googleUser->shouldReceive('getName')->andReturn('Invited Google');
        $googleUser->shouldReceive('getEmail')->andReturn('invited-google@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn(null);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andReturn($googleUser);

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'intent' => 'owner',
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('oauth_token=', $response->headers->get('Location'));
        $this->assertStringNotContainsString('owner_pending', $response->headers->get('Location'));
    }

    public function test_callback_rejects_new_web_user_without_owner_intent(): void
    {
        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-customer-123');
        $googleUser->shouldReceive('getName')->andReturn('Google Customer');
        $googleUser->shouldReceive('getEmail')->andReturn('customer.google@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn(null);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andReturn($googleUser);

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'venue_slug' => 'demo-cafe',
                    'redirect' => '/card',
                    'intent' => null,
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('error=google_auth_failed', $response->headers->get('Location'));
        $this->assertStringNotContainsString('oauth_token=', $response->headers->get('Location'));

        $this->assertDatabaseHas('users', [
            'email' => 'customer.google@example.com',
            'google_id' => 'google-customer-123',
        ]);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_callback_updates_existing_user(): void
    {
        $existing = $this->createUser([
            'email' => 'existing@example.com',
            'google_id' => null,
        ]);

        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-456');
        $googleUser->shouldReceive('getName')->andReturn('Existing User');
        $googleUser->shouldReceive('getEmail')->andReturn('existing@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn('https://example.com/new-avatar.jpg');

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andReturn($googleUser);

        $this
            ->withSession(['google_auth.intent' => []])
            ->get('/auth/google/callback')
            ->assertRedirect();

        $this->assertSame('google-456', $existing->fresh()->google_id);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_callback_redirects_with_error_when_google_fails(): void
    {
        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andThrow(new \Exception('OAuth failed'));

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'redirect' => '/card',
                    'venue_slug' => 'demo-cafe',
                    'intent' => 'owner',
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('error=google_auth_failed', $response->headers->get('Location'));
    }

    public function test_redirect_sanitizes_invalid_query_parameters(): void
    {
        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('redirect')
            ->once()
            ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

        $this->get('/auth/google/redirect?venue_slug=INVALID&redirect=//evil.com&intent=customer');

        $this->assertSame([
            'venue_slug' => null,
            'redirect' => '/app',
            'intent' => null,
            'mobile' => false,
        ], session('google_auth.intent'));
    }

    public function test_callback_uses_owner_default_redirect_for_unprovisioned_user(): void
    {
        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-789');
        $googleUser->shouldReceive('getName')->andReturn('');
        $googleUser->shouldReceive('getEmail')->andReturn('guest@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn(null);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andReturn($googleUser);

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'redirect' => '',
                    'venue_slug' => null,
                    'intent' => 'owner',
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('/book-demo', $response->headers->get('Location'));

        $this->assertDatabaseMissing('users', [
            'email' => 'guest@example.com',
        ]);
    }

    public function test_redirect_stores_mobile_intent(): void
    {
        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('redirect')
            ->once()
            ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

        $this->get('/auth/google/redirect?mobile=1');

        $this->assertTrue(session('google_auth.intent')['mobile']);
    }

    public function test_callback_redirects_mobile_app_with_token(): void
    {
        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getId')->andReturn('google-mobile-1');
        $googleUser->shouldReceive('getName')->andReturn('Mobile Google');
        $googleUser->shouldReceive('getEmail')->andReturn('mobile.google@example.com');
        $googleUser->shouldReceive('getAvatar')->andReturn(null);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andReturn($googleUser);

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'mobile' => true,
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect();
        $location = (string) $response->headers->get('Location');
        $this->assertStringStartsWith('flotory://login?', $location);
        $this->assertStringContainsString('oauth_token=', $location);
    }

    public function test_callback_redirects_mobile_app_with_error_when_google_fails(): void
    {
        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->once()
            ->andThrow(new \Exception('OAuth failed'));

        $response = $this
            ->withSession([
                'google_auth.intent' => [
                    'mobile' => true,
                ],
            ])
            ->get('/auth/google/callback');

        $response->assertRedirect('flotory://login?error=google_auth_failed');
    }

    public function test_redirect_sanitizes_relative_paths_without_leading_slash(): void
    {
        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturnSelf();

        Socialite::shouldReceive('redirect')
            ->once()
            ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

        $this->get('/auth/google/redirect?redirect=card');

        $this->assertSame('/app', session('google_auth.intent')['redirect']);
    }
}
