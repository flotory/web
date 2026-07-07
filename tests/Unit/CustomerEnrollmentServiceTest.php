<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Services\CustomerEnrollmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class CustomerEnrollmentServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    private CustomerEnrollmentService $enrollment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enrollment = app(CustomerEnrollmentService::class);
    }

    public function test_find_at_brand_returns_existing_customer(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user);

        $found = $this->enrollment->findAtBrand($user, $venue);

        $this->assertNotNull($found);
        $this->assertTrue($found->is($customer));
    }

    public function test_find_or_join_creates_customer_on_first_scan(): void
    {
        $user = $this->createUser(['email' => 'new-member@example.com']);
        $venue = $this->createPublishedVenue();

        $customer = $this->enrollment->findOrJoin($user, $venue);

        $this->assertTrue($customer->wasRecentlyCreated);
        $this->assertSame(0, $customer->stamps);
        $this->assertDatabaseHas('customers', [
            'user_id' => $user->id,
            'brand_id' => $venue->brand_id,
        ]);
    }

    public function test_find_or_join_returns_same_customer_on_repeat(): void
    {
        $user = $this->createUser(['email' => 'repeat-member@example.com']);
        $venue = $this->createPublishedVenue();

        $first = $this->enrollment->findOrJoin($user, $venue);
        $first->forceFill(['stamps' => 3])->save();

        $second = $this->enrollment->findOrJoin($user, $venue);

        $this->assertFalse($second->wasRecentlyCreated);
        $this->assertTrue($second->is($first));
        $this->assertSame(3, $second->stamps);
        $this->assertSame(1, Customer::query()->where('user_id', $user->id)->where('brand_id', $venue->brand_id)->count());
    }
}
