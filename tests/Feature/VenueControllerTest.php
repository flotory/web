<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_owner_can_create_a_venue_and_becomes_its_active_owner(): void
    {
        $user = $this->createUser([
            'name' => 'Venue Owner',
            'email' => 'owner@example.com',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/venues', [
            'name' => 'Sunrise Cafe',
            'category' => 'cafe',
            'address' => '1 Market Street',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('venue.name', 'Sunrise Cafe')
            ->assertJsonPath('venue.category', 'cafe');

        $venueId = $response->json('venue.id');

        $this->assertDatabaseHas('venues', [
            'id' => $venueId,
            'name' => 'Sunrise Cafe',
            'category' => 'cafe',
        ]);

        $this->assertDatabaseHas('venue_users', [
            'venue_id' => $venueId,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $this->assertSame($venueId, $user->fresh()->active_venue_id);
    }

    public function test_non_member_cannot_view_a_private_venue(): void
    {
        $user = $this->createUser();
        $owner = $this->createUser(['email' => 'existing-owner@example.com']);
        $venue = $this->createVenue();

        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($user);

        $this->getJson("/api/venues/{$venue->id}")
            ->assertForbidden();
    }
}
