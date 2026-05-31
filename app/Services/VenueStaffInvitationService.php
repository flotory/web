<?php

namespace App\Services;

use App\Enums\VenueStaffInvitationStatus;
use App\Mail\StaffInvitationMail;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueStaffInvitation;
use App\Models\VenueUser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VenueStaffInvitationService
{
    public const EXPIRY_DAYS = 7;

    public function invite(Venue $venue, User $inviter, string $email, string $role = 'staff'): VenueStaffInvitation
    {
        $email = Str::lower(trim($email));

        if ($role !== 'staff') {
            throw ValidationException::withMessages([
                'role' => 'Only staff invitations are supported.',
            ]);
        }

        $existingUser = User::query()->where('email', $email)->first();

        if ($existingUser) {
            $membership = VenueUser::query()
                ->where('venue_id', $venue->id)
                ->where('user_id', $existingUser->id)
                ->first();

            if ($membership?->role === 'owner') {
                throw ValidationException::withMessages([
                    'email' => 'This person is the venue owner and cannot be invited as staff.',
                ]);
            }

            if ($membership?->role === 'staff') {
                throw ValidationException::withMessages([
                    'email' => 'This person is already on the team.',
                ]);
            }
        }

        $existingInvite = VenueStaffInvitation::query()
            ->where('venue_id', $venue->id)
            ->where('email', $email)
            ->whereIn('status', [
                VenueStaffInvitationStatus::Pending,
                VenueStaffInvitationStatus::Expired,
            ])
            ->latest()
            ->first();

        if ($existingInvite) {
            return $this->resend($existingInvite);
        }

        $invitation = VenueStaffInvitation::query()->create([
            'venue_id' => $venue->id,
            'email' => $email,
            'role' => $role,
            'token' => $this->generateToken(),
            'invited_by' => $inviter->id,
            'status' => VenueStaffInvitationStatus::Pending,
            'expires_at' => now()->addDays(self::EXPIRY_DAYS),
        ]);

        $this->sendInvitationEmail($invitation->load(['venue', 'inviter']));

        return $invitation;
    }

    public function resend(VenueStaffInvitation $invitation): VenueStaffInvitation
    {
        $this->syncExpiry($invitation);

        if ($invitation->status === VenueStaffInvitationStatus::Accepted) {
            throw ValidationException::withMessages([
                'invitation' => 'This invitation was already accepted.',
            ]);
        }

        if ($invitation->status === VenueStaffInvitationStatus::Cancelled) {
            throw ValidationException::withMessages([
                'invitation' => 'Cancelled invitations cannot be resent. Send a new invite from the form.',
            ]);
        }

        $invitation->forceFill([
            'status' => VenueStaffInvitationStatus::Pending,
            'token' => $this->generateToken(),
            'expires_at' => now()->addDays(self::EXPIRY_DAYS),
            'accepted_at' => null,
            'accepted_by_user_id' => null,
        ])->save();

        $this->sendInvitationEmail($invitation->fresh(['venue', 'inviter']));

        return $invitation;
    }

    public function cancel(VenueStaffInvitation $invitation): VenueStaffInvitation
    {
        $this->assertManageable($invitation);

        if ($invitation->status !== VenueStaffInvitationStatus::Pending) {
            throw ValidationException::withMessages([
                'invitation' => 'Only pending invitations can be cancelled.',
            ]);
        }

        $invitation->forceFill([
            'status' => VenueStaffInvitationStatus::Cancelled,
        ])->save();

        return $invitation;
    }

    public function findUsableByToken(string $token): VenueStaffInvitation
    {
        $invitation = VenueStaffInvitation::query()
            ->where('token', $token)
            ->with(['venue', 'inviter:id,name,email'])
            ->first();

        if (! $invitation) {
            throw ValidationException::withMessages([
                'token' => 'This invitation link is invalid.',
            ]);
        }

        $this->syncExpiry($invitation);

        if (! $invitation->isUsable()) {
            $message = match ($invitation->status) {
                VenueStaffInvitationStatus::Accepted => 'This invitation has already been accepted.',
                VenueStaffInvitationStatus::Cancelled => 'This invitation was cancelled.',
                VenueStaffInvitationStatus::Expired => 'This invitation has expired. Ask the venue owner to resend it.',
                VenueStaffInvitationStatus::Pending => 'This invitation is no longer valid.',
            };

            throw ValidationException::withMessages([
                'token' => $message,
            ]);
        }

        return $invitation;
    }

    public function accept(VenueStaffInvitation $invitation, User $user): VenueUser
    {
        $this->syncExpiry($invitation);

        if (! $invitation->isUsable()) {
            throw ValidationException::withMessages([
                'token' => 'This invitation is no longer valid.',
            ]);
        }

        if (Str::lower($user->email) !== Str::lower($invitation->email)) {
            throw ValidationException::withMessages([
                'email' => 'Sign in with the email address that received this invitation.',
            ]);
        }

        return DB::transaction(function () use ($invitation, $user): VenueUser {
            $locked = VenueStaffInvitation::query()
                ->whereKey($invitation->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->syncExpiry($locked);

            if (! $locked->isUsable()) {
                throw ValidationException::withMessages([
                    'token' => 'This invitation is no longer valid.',
                ]);
            }

            $existingMembership = VenueUser::query()
                ->where('venue_id', $locked->venue_id)
                ->where('user_id', $user->id)
                ->first();

            if ($existingMembership?->role === 'owner') {
                throw ValidationException::withMessages([
                    'email' => 'Venue owners cannot join as staff through an invitation.',
                ]);
            }

            $membership = VenueUser::query()->updateOrCreate(
                [
                    'venue_id' => $locked->venue_id,
                    'user_id' => $user->id,
                ],
                [
                    'role' => 'staff',
                ],
            );

            if (! $user->active_venue_id) {
                $user->forceFill(['active_venue_id' => $locked->venue_id])->save();
            }

            $locked->forceFill([
                'status' => VenueStaffInvitationStatus::Accepted,
                'accepted_at' => now(),
                'accepted_by_user_id' => $user->id,
            ])->save();

            return $membership->load('user:id,name,email');
        });
    }

    public function registerAndAccept(VenueStaffInvitation $invitation, string $name, string $password): array
    {
        if (User::query()->where('email', $invitation->email)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'An account already exists for this email. Sign in to accept the invitation.',
            ]);
        }

        return DB::transaction(function () use ($invitation, $name, $password): array {
            $user = User::query()->create([
                'name' => $name,
                'email' => $invitation->email,
                'password' => $password,
                'is_admin' => false,
                'active_venue_id' => $invitation->venue_id,
            ]);

            $membership = $this->accept($invitation, $user);

            return [
                'user' => $user,
                'membership' => $membership,
                'token' => $user->createToken('web')->plainTextToken,
            ];
        });
    }

    public function syncExpiry(VenueStaffInvitation $invitation): void
    {
        if (
            $invitation->status === VenueStaffInvitationStatus::Pending
            && $invitation->expires_at->isPast()
        ) {
            $invitation->forceFill([
                'status' => VenueStaffInvitationStatus::Expired,
            ])->save();
        }
    }

    public function inviteUrl(VenueStaffInvitation $invitation): string
    {
        $base = rtrim(config('app.frontend_url', config('app.url')), '/');

        return "{$base}/invite/{$invitation->token}";
    }

    private function sendInvitationEmail(VenueStaffInvitation $invitation): void
    {
        Mail::to($invitation->email)->send(new StaffInvitationMail($invitation, $this->inviteUrl($invitation)));
    }

    private function generateToken(): string
    {
        do {
            $token = Str::random(64);
        } while (VenueStaffInvitation::query()->where('token', $token)->exists());

        return $token;
    }

    private function assertManageable(VenueStaffInvitation $invitation): void
    {
        $this->syncExpiry($invitation);
    }
}
