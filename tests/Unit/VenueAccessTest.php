<?php

namespace Tests\Unit;

use App\Support\VenueAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueAccessTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_platform_admin_cannot_access_venue_owner_tools(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue();

        $this->assertFalse(VenueAccess::canAccess($admin, $venue, ['owner']));
        $this->assertFalse(VenueAccess::canAccess($admin, $venue));
    }

    public function test_non_member_cannot_access_venue(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();

        $this->assertFalse(VenueAccess::canAccess($user, $venue, ['owner']));
    }

    public function test_owner_member_can_access_owner_scoped_routes(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $user, 'owner');

        $this->assertTrue(VenueAccess::canAccess($user, $venue, ['owner']));
        $this->assertTrue(VenueAccess::canAccess($user, $venue, ['owner', 'staff']));
    }

    public function test_staff_member_cannot_access_owner_only_routes(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $user, 'staff');

        $this->assertFalse(VenueAccess::canAccess($user, $venue, ['owner']));
        $this->assertTrue(VenueAccess::canAccess($user, $venue, ['owner', 'staff']));
    }
}
