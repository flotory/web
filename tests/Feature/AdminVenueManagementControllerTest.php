<?php

namespace Tests\Feature;

use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AdminVenueManagementControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_admin_can_list_and_search_manageable_venues(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser(['email' => 'manage-owner@example.com']);
        $venue = $this->createVenue(['name' => 'Harbor Coffee', 'status' => Venue::STATUS_PUBLISHED]);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/manage-venues?search=Harbor')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('venues.0.name', 'Harbor Coffee')
            ->assertJsonPath('venues.0.owner.email', 'manage-owner@example.com');
    }

    public function test_admin_can_view_and_update_any_venue(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser(['email' => 'edit-owner@example.com']);
        $venue = $this->createVenue([
            'name' => 'Old Name Cafe',
            'status' => Venue::STATUS_DRAFT,
            'address' => '1 Old Street',
            'latitude' => 53.01,
            'longitude' => 18.61,
        ]);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/manage-venues/{$venue->id}")
            ->assertOk()
            ->assertJsonPath('venue.name', 'Old Name Cafe');

        $this->putJson("/api/admin/manage-venues/{$venue->id}", [
            'name' => 'Updated Name Cafe',
            'slug' => $venue->slug,
            'category' => 'cafe',
            'address' => '2 New Street',
            'latitude' => 53.02,
            'longitude' => 18.62,
            'phone' => '+48111222333',
        ])
            ->assertOk()
            ->assertJsonPath('venue.name', 'Updated Name Cafe')
            ->assertJsonPath('venue.phone', '+48111222333');

        $this->assertDatabaseHas('venues', [
            'id' => $venue->id,
            'name' => 'Updated Name Cafe',
            'phone' => '+48111222333',
        ]);
    }

    public function test_non_admin_cannot_access_manage_venues_api(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson('/api/admin/manage-venues')->assertForbidden();
        $this->getJson("/api/admin/manage-venues/{$venue->id}")->assertForbidden();
        $this->putJson("/api/admin/manage-venues/{$venue->id}", [
            'name' => 'Blocked',
            'category' => 'cafe',
        ])->assertForbidden();
    }

    public function test_admin_still_cannot_use_owner_venue_update_route(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue();

        Sanctum::actingAs($admin);

        $this->putJson("/api/venues/{$venue->id}", [
            'name' => 'Blocked',
            'category' => 'cafe',
        ])->assertForbidden();
    }
}
