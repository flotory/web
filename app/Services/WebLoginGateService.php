<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class WebLoginGateService
{
    public function __construct(private OwnerInvitationService $ownerInvitations) {}
    /** Device names sent by the Vue web app and web Google OAuth. */
    public const WEB_DEVICE_NAMES = ['browser', 'web', 'google-oauth-web'];

    public function isWebClient(string $deviceName): bool
    {
        return in_array(strtolower($deviceName), self::WEB_DEVICE_NAMES, true);
    }

    /** Web sign-in is limited to platform admins and venue owners. */
    public function mayAuthenticateOnWeb(User $user): bool
    {
        if ($user->is_admin) {
            return true;
        }

        return $user->memberships()->where('role', 'owner')->exists()
            || $this->ownerInvitations->userHasAcceptedInvitation($user);
    }

    public function rejectUnlessAllowedOnWeb(User $user, string $deviceName): void
    {
        if (! $this->isWebClient($deviceName)) {
            return;
        }

        if ($this->mayAuthenticateOnWeb($user)) {
            return;
        }

        throw ValidationException::withMessages([
            'email' => 'The provided credentials are incorrect.',
        ]);
    }
}
