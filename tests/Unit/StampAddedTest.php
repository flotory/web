<?php

namespace Tests\Unit;

use App\Events\StampAdded;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection as SupportCollection;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class StampAddedTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_broadcast_payload_uses_stamp_terminology(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue(['name' => 'Demo Cafe']);
        $customer = $this->createCustomer($venue, $user, ['stamps' => 2]);
        $customer->load('venue', 'user');

        $event = new StampAdded(
            $customer,
            1,
            1,
            null,
            new Collection(),
            new SupportCollection(),
            1,
            false,
        );

        $payload = $event->broadcastWith();

        $this->assertSame('stamp.added', $event->broadcastAs());
        $this->assertSame('1 stamp added at Demo Cafe.', $payload['message']);
    }

    public function test_broadcast_payload_pluralizes_stamps(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue(['name' => 'Demo Cafe']);
        $customer = $this->createCustomer($venue, $user, ['stamps' => 5]);
        $customer->load('venue', 'user');

        $event = new StampAdded(
            $customer,
            2,
            3,
            null,
            new Collection(),
            new SupportCollection(),
            1,
            false,
        );

        $this->assertSame('3 stamps added at Demo Cafe.', $event->broadcastWith()['message']);
    }
}
