<?php

namespace Tests\Unit;

use App\Models\Brand;
use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\Reward;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class ModelRelationshipTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_venue_relationships(): void
    {
        $owner = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $membership = $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $customerUser);
        $reward = $this->createReward($venue);
        $visit = $this->createVisit($customer, $owner);

        $venue->delete();

        $venue = Venue::withTrashed()->findOrFail($venue->id);

        $this->assertTrue($venue->archived);
        $this->assertTrue($venue->memberships->contains($membership));
        $this->assertTrue($venue->owners->contains($membership));
        $this->assertTrue($venue->customers->contains($customer));
        $this->assertTrue($venue->rewards->contains($reward));
        $this->assertTrue($venue->visits->contains($visit));
        $this->assertTrue($venue->members->contains($owner));
    }

    public function test_user_relationships(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $membership = $this->attachMember($venue, $user, 'owner');
        $user->forceFill(['active_venue_id' => $venue->id])->save();
        $customer = $this->createCustomer($venue, $user);
        $visit = $this->createVisit($customer, $user);

        $this->assertTrue($user->isAdmin() === false);
        $this->assertTrue($user->activeVenue->is($venue));
        $this->assertTrue($user->memberships->contains($membership));
        $this->assertTrue($user->venues->contains($venue));
        $this->assertTrue($user->customers->contains($customer));
        $this->assertTrue($user->createdVisits->contains($visit));
    }

    public function test_customer_relationships(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user);
        $cycle = $this->createRewardCycle($customer);
        $reward = $this->createReward($venue);
        $unlock = $this->createRewardUnlock($customer, $reward);
        $visit = $this->createVisit($customer, $user);

        $this->assertTrue($customer->venue->is($venue));
        $this->assertTrue($customer->user->is($user));
        $this->assertTrue($customer->visits->contains($visit));
        $this->assertTrue($customer->rewardCycles->contains($cycle));
        $this->assertTrue($customer->rewardUnlocks->contains($unlock));
    }

    public function test_reward_and_unlock_relationships(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user);
        $reward = $this->createReward($venue);
        $unlock = $this->createRewardUnlock($customer, $reward, ['claimed_by' => $user->id]);

        $this->assertTrue($reward->venue->is($venue));
        $this->assertTrue($reward->unlocks->contains($unlock));
        $this->assertTrue($unlock->customer->is($customer));
        $this->assertTrue($unlock->reward->is($reward));
        $this->assertTrue($unlock->claimedBy->is($user));
    }

    public function test_brand_relationships(): void
    {
        $owner = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Brand Hub', 'slug' => 'brand-hub']);
        $branch = $this->createVenueForBrand($primary->brand, [
            'name' => 'Brand Hub · Branch',
            'slug' => 'brand-hub-branch',
            'address' => '3 Branch Lane, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);
        $membership = $this->attachMember($primary, $owner, 'owner');
        $customerUser = $this->createUser(['email' => 'brand-guest@example.com']);
        $customer = $this->createCustomer($primary, $customerUser);
        $reward = $this->createReward($primary);

        $brand = Brand::query()->with(['venues', 'memberships', 'customers', 'rewards'])->findOrFail($primary->brand_id);

        $this->assertTrue($brand->venues->contains($primary));
        $this->assertTrue($brand->venues->contains($branch));
        $this->assertTrue($brand->memberships->contains($membership));
        $this->assertTrue($brand->customers->contains($customer));
        $this->assertTrue($brand->rewards->contains($reward));
        $this->assertSame($primary->id, $brand->primaryVenue()->first()?->id);
    }

    public function test_visit_and_membership_relationships(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user);
        $visit = $this->createVisit($customer, $user);
        $membership = $this->attachMember($venue, $user, 'staff');
        $cycle = $this->createRewardCycle($customer);

        $this->assertTrue($visit->customer->is($customer));
        $this->assertTrue($visit->venue->is($venue));
        $this->assertTrue($visit->creator->is($user));
        $this->assertTrue($membership->venue->is($venue));
        $this->assertTrue($membership->user->is($user));
        $this->assertTrue($cycle->customer->is($customer));
    }
}
