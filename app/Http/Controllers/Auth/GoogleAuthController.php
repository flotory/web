<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\WebLoginGateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function __construct(private WebLoginGateService $webLoginGate) {}

    public function redirect(Request $request): RedirectResponse
    {
        $request->session()->put('google_auth.intent', [
            'venue_slug' => $this->sanitizeVenueSlug($request->query('venue_slug')),
            'redirect' => $this->sanitizeRedirect($request->query('redirect')),
            'intent' => $this->sanitizeIntent($request->query('intent')),
            'mobile' => $this->sanitizeMobile($request->query('mobile')),
        ]);

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $intent = $request->session()->pull('google_auth.intent', []);

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable) {
            if ($this->isMobileIntent($intent)) {
                return redirect($this->buildMobileLoginUrl([
                    'error' => 'google_auth_failed',
                ]));
            }

            return redirect($this->buildFrontendPath('/login', [
                'error' => 'google_auth_failed',
                'redirect' => $this->sanitizeRedirect($intent['redirect'] ?? null),
                'venue_slug' => $this->sanitizeVenueSlug($intent['venue_slug'] ?? null),
                'intent' => $this->sanitizeIntent($intent['intent'] ?? null),
            ]));
        }

        $ownerIntent = $this->sanitizeIntent($intent['intent'] ?? null);
        $user = User::query()->firstWhere('email', $googleUser->getEmail());

        if ($ownerIntent === 'owner' && ! $this->isMobileIntent($intent)) {
            if (! $user instanceof User) {
                return redirect($this->buildFrontendPath('/book-demo', []));
            }

            if (! $this->webLoginGate->mayAuthenticateOnWeb($user)) {
                return redirect($this->buildFrontendPath('/book-demo', [
                    'notice' => 'owner_pending',
                ]));
            }
        }

        if (! $user instanceof User) {
            $user = User::query()->create([
                'name' => $googleUser->getName() ?: 'Guest',
                'email' => $googleUser->getEmail(),
                'password' => Hash::make(Str::password(32)),
                'is_admin' => false,
                'google_id' => $googleUser->getId(),
                'google_avatar' => $googleUser->getAvatar(),
            ]);
        } else {
            $user->forceFill([
                'google_id' => $googleUser->getId(),
                'google_avatar' => $googleUser->getAvatar(),
            ])->save();
        }

        if ($this->isMobileIntent($intent)) {
            $token = $user->createToken('google-oauth-mobile')->plainTextToken;

            return redirect($this->buildMobileLoginUrl([
                'oauth_token' => $token,
            ]));
        }

        $ownerIntent = $this->sanitizeIntent($intent['intent'] ?? null);

        if (! $this->webLoginGate->mayAuthenticateOnWeb($user) && $ownerIntent !== 'owner') {
            return redirect($this->buildFrontendPath('/login', [
                'error' => 'google_auth_failed',
                'redirect' => $this->sanitizeRedirect($intent['redirect'] ?? null),
                'venue_slug' => $this->sanitizeVenueSlug($intent['venue_slug'] ?? null),
                'intent' => $ownerIntent,
            ]));
        }

        $token = $user->createToken('google-oauth-web')->plainTextToken;

        return redirect($this->buildFrontendPath('/login', [
            'oauth_token' => $token,
            'redirect' => $this->sanitizeRedirect($intent['redirect'] ?? null, $ownerIntent),
            'venue_slug' => $this->sanitizeVenueSlug($intent['venue_slug'] ?? null),
            'intent' => $ownerIntent,
        ]));
    }

    private function buildFrontendPath(string $path, array $query): string
    {
        $base = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        $params = array_filter($query, static fn ($value): bool => filled($value));
        $queryString = http_build_query($params);

        return $queryString === '' ? "{$base}{$path}" : "{$base}{$path}?{$queryString}";
    }

    private function sanitizeRedirect(mixed $path, ?string $intent = null): string
    {
        if (! is_string($path) || $path === '') {
            return $intent === 'owner' ? '/book-demo' : '/app';
        }

        if (! Str::startsWith($path, '/')) {
            return '/app';
        }

        if (Str::startsWith($path, ['//', '/api', '/auth/google'])) {
            return '/app';
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

    private function sanitizeIntent(mixed $intent): ?string
    {
        return $intent === 'owner' ? 'owner' : null;
    }

    private function sanitizeMobile(mixed $mobile): bool
    {
        return in_array($mobile, ['1', 'true', true, 1], true);
    }

    /**
     * @param  array<string, mixed>  $intent
     */
    private function isMobileIntent(array $intent): bool
    {
        return ($intent['mobile'] ?? false) === true;
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function buildMobileLoginUrl(array $query): string
    {
        $params = array_filter($query, static fn ($value): bool => filled($value));
        $queryString = http_build_query($params);

        return $queryString === '' ? 'flotory://login' : "flotory://login?{$queryString}";
    }
}
