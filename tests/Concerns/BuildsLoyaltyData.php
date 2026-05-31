<?php

namespace Tests\Concerns;

use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Models\Visit;
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
            'qr_token' => (string) Str::uuid(),
            'stamps' => 0,
        ], $attributes));
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

    protected function createVisit(Customer $customer, User $staff, array $attributes = []): Visit
    {
        return Visit::query()->create(array_merge([
            'customer_id' => $customer->id,
            'venue_id' => $customer->venue_id,
            'created_by' => $staff->id,
        ], $attributes));
    }
}
