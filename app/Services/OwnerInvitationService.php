<?php

namespace App\Services;

use App\Mail\OwnerInvitationMail;
use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\OwnerInvitation;
use App\Models\User;
use App\Models\Venue;
use App\Support\AuditLog;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OwnerInvitationService
{
    public function ttlDays(): int
    {
        $days = config('flotory.owner_invitation_ttl_days', 7);

        return is_int($days) && $days > 0 ? $days : 7;
    }

    public function findUsableByToken(string $token): ?OwnerInvitation
    {
        $invitation = OwnerInvitation::query()
            ->with('brand:id,name,slug,status')
            ->where('token', $token)
            ->first();

        return $invitation instanceof OwnerInvitation && $invitation->isUsable()
            ? $invitation
            : null;
    }

    public function userMaySelfCreateVenue(User $user): bool
    {
        if ($user->is_admin) {
            return false;
        }

        if ($user->memberships()->where('role', 'owner')->exists()) {
            return true;
        }

        return OwnerInvitation::query()
            ->where('email', Str::lower($user->email))
            ->whereNotNull('accepted_at')
            ->exists();
    }

    public function userHasAcceptedInvitation(User $user): bool
    {
        return OwnerInvitation::query()
            ->where('email', Str::lower($user->email))
            ->whereNotNull('accepted_at')
            ->exists();
    }

    /**
     * @return array{invitation: OwnerInvitation, register_url: string}
     */
    public function createAndSend(string $email, ?User $invitedBy, ?string $businessName = null): array
    {
        $normalizedEmail = Str::lower(trim($email));

        if ($normalizedEmail === '') {
            throw ValidationException::withMessages([
                'email' => 'Owner email is required.',
            ]);
        }

        $existingUser = User::query()->firstWhere('email', $normalizedEmail);

        if ($existingUser instanceof User && $existingUser->is_admin) {
            throw ValidationException::withMessages([
                'email' => 'Platform admin accounts cannot receive owner invitations.',
            ]);
        }

        if ($existingUser instanceof User && $existingUser->memberships()->where('role', 'owner')->exists()) {
            throw ValidationException::withMessages([
                'email' => 'This email already manages a venue. They can log in directly.',
            ]);
        }

        OwnerInvitation::query()
            ->whereNull('brand_id')
            ->where('email', $normalizedEmail)
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $invitation = OwnerInvitation::query()->create([
            'brand_id' => null,
            'email' => $normalizedEmail,
            'business_name' => filled($businessName) ? trim($businessName) : null,
            'token' => Str::random(64),
            'invited_by_user_id' => $invitedBy?->id,
            'expires_at' => now()->addDays($this->ttlDays()),
        ]);

        $registerUrl = $this->registerUrlFor($invitation);

        Mail::to($normalizedEmail)->send(new OwnerInvitationMail($invitation, $registerUrl));

        if ($invitedBy instanceof User) {
            AuditLog::record(
                description: 'owner_invitation.sent',
                subject: $invitation,
                causer: $invitedBy,
                event: 'created',
                properties: [
                    'email' => $normalizedEmail,
                    'business_name' => $invitation->business_name,
                ],
            );
        }

        return [
            'invitation' => $invitation->fresh(['brand:id,name,slug,status']),
            'register_url' => $registerUrl,
        ];
    }

    public function revoke(OwnerInvitation $invitation, User $actor): OwnerInvitation
    {
        if ($invitation->accepted_at !== null) {
            throw ValidationException::withMessages([
                'invitation' => 'This invitation was already accepted.',
            ]);
        }

        $invitation->forceFill(['revoked_at' => now()])->save();

        AuditLog::record(
            description: 'owner_invitation.revoked',
            subject: $invitation,
            causer: $actor,
            event: 'updated',
            properties: [
                'brand_id' => $invitation->brand_id,
                'email' => $invitation->email,
            ],
        );

        return $invitation->fresh();
    }

    /**
     * @return array{user: User, token: string}
     */
    public function accept(OwnerInvitation $invitation, string $name, string $password): array
    {
        if (! $invitation->isUsable()) {
            throw ValidationException::withMessages([
                'invite' => 'This invitation is invalid or has expired.',
            ]);
        }

        return DB::transaction(function () use ($invitation, $name, $password): array {
            $locked = OwnerInvitation::query()
                ->whereKey($invitation->id)
                ->lockForUpdate()
                ->first();

            if (! $locked instanceof OwnerInvitation || ! $locked->isUsable()) {
                throw ValidationException::withMessages([
                    'invite' => 'This invitation is invalid or has expired.',
                ]);
            }

            $user = User::query()->firstWhere('email', $locked->email);

            if ($user instanceof User) {
                $user->forceFill([
                    'name' => $name,
                    'password' => Hash::make($password),
                ])->save();
            } else {
                $user = User::query()->create([
                    'name' => $name,
                    'email' => $locked->email,
                    'password' => Hash::make($password),
                    'is_admin' => false,
                ]);
            }

            if ($locked->brand_id !== null) {
                BrandUser::query()->firstOrCreate(
                    [
                        'brand_id' => $locked->brand_id,
                        'user_id' => $user->id,
                    ],
                    ['role' => 'owner'],
                );

                $primaryVenueId = Venue::query()
                    ->where('brand_id', $locked->brand_id)
                    ->where('is_primary', true)
                    ->value('id');

                $user->forceFill(['active_venue_id' => $primaryVenueId])->save();
            }

            $locked->forceFill(['accepted_at' => now()])->save();

            return [
                'user' => $user->fresh(),
                'token' => $user->createToken('owner-invite-web')->plainTextToken,
            ];
        });
    }

    public function attachBrandToAcceptedInvitation(User $user, Brand $brand): void
    {
        OwnerInvitation::query()
            ->where('email', Str::lower($user->email))
            ->whereNotNull('accepted_at')
            ->whereNull('brand_id')
            ->latest('accepted_at')
            ->limit(1)
            ->update(['brand_id' => $brand->id]);
    }

    public function registerUrlFor(OwnerInvitation $invitation): string
    {
        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $query = http_build_query(['invite' => $invitation->token]);

        return "{$base}/register?{$query}";
    }

    /**
     * @return Collection<int, OwnerInvitation>
     */
    public function listForAdmin(?string $search = null): Collection
    {
        return OwnerInvitation::query()
            ->with(['brand:id,name,slug,status', 'invitedBy:id,name'])
            ->when(filled($search), function ($query) use ($search): void {
                $term = '%'.trim((string) $search).'%';
                $query->where(function ($builder) use ($term): void {
                    $builder
                        ->where('email', 'like', $term)
                        ->orWhere('business_name', 'like', $term);
                });
            })
            ->latest()
            ->limit(100)
            ->get();
    }

    public function pipelineStage(OwnerInvitation $invitation): string
    {
        if ($invitation->revoked_at !== null) {
            return 'revoked';
        }

        if ($invitation->accepted_at === null) {
            return $invitation->isExpired() ? 'expired' : 'invited';
        }

        $brand = $this->resolvePipelineBrand($invitation);

        if (! $brand instanceof Brand) {
            return 'registered';
        }

        return match ($brand->status) {
            Brand::STATUS_PUBLISHED => 'published',
            Brand::STATUS_PENDING_REVIEW => 'pending_review',
            default => 'venue_draft',
        };
    }

    private function resolvePipelineBrand(OwnerInvitation $invitation): ?Brand
    {
        if ($invitation->relationLoaded('brand') && $invitation->brand instanceof Brand) {
            return $invitation->brand;
        }

        if ($invitation->brand_id !== null) {
            return Brand::query()->find($invitation->brand_id);
        }

        $user = User::query()->firstWhere('email', $invitation->email);
        if (! $user instanceof User) {
            return null;
        }

        return Brand::query()
            ->whereHas('memberships', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('role', 'owner'))
            ->latest('id')
            ->first();
    }
}
