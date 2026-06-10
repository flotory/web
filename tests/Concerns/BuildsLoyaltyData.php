<?php

namespace Tests\Concerns;

use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\NfcTag;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\UserStampToken;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use App\Models\VenueUser;
use App\Models\Visit;
use App\Support\LoyaltyQr;
use Illuminate\Support\Str;

trait BuildsLoyaltyData
{
    protected function createUser(array $attributes = []): User
    {
        return User::query()->create(array_merge([
            'name' => 'Test User',
            'email' => 'user-'.Str::lower(Str::random(8)).'@example.com',
            'password' => 'password',
            'is_admin' => false,
        ], $attributes));
    }

    protected function createVenue(array $attributes = []): Venue
    {
        return Venue::query()->create(array_merge([
            'name' => 'Test Venue',
            'slug' => 'venue-'.Str::lower(Str::random(8)),
            'category' => 'cafe',
        ], $attributes));
    }

    protected function createPublishedVenue(array $attributes = []): Venue
    {
        return $this->createVenue(array_merge([
            'status' => Venue::STATUS_PUBLISHED,
            'published_at' => now(),
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ], $attributes));
    }

    protected function attachMember(Venue $venue, User $user, string $role = 'owner'): VenueUser
    {
        return VenueUser::query()->create([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'role' => $role,
        ]);
    }

    protected function createCustomer(Venue $venue, User $user, array $attributes = []): Customer
    {
        return Customer::query()->create(array_merge([
            'venue_id' => $venue->id,
            'user_id' => $user->id,
            'qr_token' => null,
            'stamps' => 0,
        ], $attributes));
    }

    protected function ensureUserStampToken(User $user, ?string $publicToken = null): UserStampToken
    {
        return UserStampToken::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'public_token' => $publicToken ?? (string) Str::uuid(),
                'version' => 1,
            ],
        );
    }

    protected function stampQrForUser(User $user, ?string $publicToken = null): string
    {
        $token = $this->ensureUserStampToken($user, $publicToken);

        return LoyaltyQr::memberQrPayload($token->public_token);
    }

    protected function createReward(Venue $venue, array $attributes = []): Reward
    {
        return Reward::query()->create(array_merge([
            'venue_id' => $venue->id,
            'title' => 'Free Coffee',
            'description' => 'A complimentary drink.',
            'required_stamps' => 5,
            'sort_order' => 5,
            'reward_type' => 'milestone',
            'active' => true,
        ], $attributes));
    }

    protected function createRewardCycle(Customer $customer, array $attributes = []): CustomerRewardCycle
    {
        return CustomerRewardCycle::query()->create(array_merge([
            'customer_id' => $customer->id,
            'cycle_number' => 1,
            'completed_at' => null,
        ], $attributes));
    }

    protected function createRewardUnlock(Customer $customer, Reward $reward, array $attributes = []): RewardUnlock
    {
        return RewardUnlock::query()->create(array_merge([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
            'claimed_at' => null,
            'claimed_by' => null,
        ], $attributes));
    }

    protected function createVenueSetupFile(Venue $venue, ?User $uploader = null, array $attributes = []): VenueSetupFile
    {
        $uploader ??= $this->createUser();

        return VenueSetupFile::query()->create(array_merge([
            'venue_id' => $venue->id,
            'uploaded_by_user_id' => $uploader->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'owner-setup.png',
            'path' => '/uploads/venue-setup/'.$venue->id.'/owner-setup.png',
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ], $attributes));
    }

    /**
     * Venue that satisfies the owner listing checklist and can be approved by admin (final logo applied).
     */
    protected function createListingReadyVenue(array $attributes = [], ?User $owner = null): Venue
    {
        $owner ??= $this->createUser();

        $venue = $this->createVenue(array_merge([
            'status' => Venue::STATUS_DRAFT,
            'category' => 'cafe',
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'logo' => '/uploads/venue-logos/demo.png',
        ], $attributes));

        $this->attachMember($venue, $owner, 'owner');
        $this->createReward($venue);
        $this->createVenueSetupFile($venue, $owner);

        return $venue->fresh();
    }

    protected function createVisit(Customer $customer, User $staff, array $attributes = []): Visit
    {
        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);

        $visit = Visit::query()->create(array_merge([
            'customer_id' => $customer->id,
            'venue_id' => $customer->venue_id,
            'created_by' => $staff->id,
        ], $attributes));

        if ($createdAt !== null) {
            $visit->forceFill(['created_at' => $createdAt])->saveQuietly();
        }

        return $visit->refresh();
    }

    protected function createNfcTag(Venue $venue, array $attributes = []): NfcTag
    {
        return NfcTag::query()->create(array_merge([
            'venue_id' => $venue->id,
            'token' => NfcTag::generateUniqueToken(),
            'label' => 'Counter stand',
            'active' => true,
        ], $attributes));
    }
}
