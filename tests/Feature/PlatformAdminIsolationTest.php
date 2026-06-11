<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class PlatformAdminIsolationTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_admin_workspace_lists_no_venues(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($admin);

        $this->getJson('/api/venues')
            ->assertOk()
            ->assertJsonPath('venues', []);
    }

    public function test_admin_cannot_create_venue(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/venues', [
            'name' => 'Admin Cafe',
            'slug' => 'admin-cafe',
            'category' => 'cafe',
        ])->assertForbidden();
    }

}
