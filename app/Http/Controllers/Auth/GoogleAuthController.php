<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $request->session()->put('google_auth.intent', [
            'venue_slug' => $this->sanitizeVenueSlug($request->query('venue_slug')),
            'redirect' => $this->sanitizeRedirect($request->query('redirect')),
        ]);

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $intent = $request->session()->pull('google_auth.intent', []);

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable) {
            return redirect($this->buildFrontendPath('/login', [
                'error' => 'google_auth_failed',
                'redirect' => $this->sanitizeRedirect($intent['redirect'] ?? null),
                'venue_slug' => $this->sanitizeVenueSlug($intent['venue_slug'] ?? null),
            ]));
        }

        $user = User::query()->firstWhere('email', $googleUser->getEmail());

        if (! $user) {
            $user = User::query()->create([
                'name' => $googleUser->getName() ?: 'Guest',
                'email' => $googleUser->getEmail(),
                'password' => Hash::make(Str::password(32)),
                'role' => UserRole::Customer,
                'google_id' => $googleUser->getId(),
                'google_avatar' => $googleUser->getAvatar(),
            ]);
        } else {
            $user->forceFill([
                'google_id' => $googleUser->getId(),
                'google_avatar' => $googleUser->getAvatar(),
            ])->save();
        }

        $token = $user->createToken('google-oauth-web')->plainTextToken;

        return redirect($this->buildFrontendPath('/login', [
            'oauth_token' => $token,
            'redirect' => $this->sanitizeRedirect($intent['redirect'] ?? null),
            'venue_slug' => $this->sanitizeVenueSlug($intent['venue_slug'] ?? null),
        ]));
    }

    private function buildFrontendPath(string $path, array $query): string
    {
        $base = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        $params = array_filter($query, static fn ($value): bool => filled($value));
        $queryString = http_build_query($params);

        return $queryString === '' ? "{$base}{$path}" : "{$base}{$path}?{$queryString}";
    }

    private function sanitizeRedirect(mixed $path): string
    {
        if (! is_string($path) || $path === '') {
            return '/card';
        }

        if (! Str::startsWith($path, '/')) {
            return '/card';
        }

        if (Str::startsWith($path, ['//', '/api', '/auth/google'])) {
            return '/card';
        }

        return $path;
    }

    private function sanitizeVenueSlug(mixed $slug): ?string
    {
        if (! is_string($slug)) {
            return null;
        }

        return preg_match('/^[a-z0-9-]{2,80}$/', $slug) === 1 ? $slug : null;
    }
}
