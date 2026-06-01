<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
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

    public function test_owner_can_create_venue_with_custom_slug(): void
    {
        $user = $this->createUser();

        Sanctum::actingAs($user);

        $this->postJson('/api/venues', [
            'name' => 'Custom Slug Cafe',
            'slug' => 'custom-slug-cafe',
        ])
            ->assertCreated()
            ->assertJsonPath('venue.slug', 'custom-slug-cafe');
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

    public function test_member_can_list_their_venues(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson('/api/venues')
            ->assertOk()
            ->assertJsonCount(1, 'venues')
            ->assertJsonPath('venues.0.membership_role', 'owner')
            ->assertJsonStructure(['venues' => [['staff_count', 'customers_count', 'rewards_count']]]);
    }

    public function test_venue_list_includes_staff_count(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');

        Sanctum::actingAs($owner);

        $this->getJson('/api/venues')
            ->assertOk()
            ->assertJsonPath('venues.0.staff_count', 1);
    }

    public function test_admin_can_list_all_venues(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $this->createVenue(['name' => 'Hidden Venue']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/venues')
            ->assertOk()
            ->assertJsonCount(1, 'venues')
            ->assertJsonPath('venues.0.membership_role', 'owner');
    }

    public function test_discover_lists_all_venues_with_join_status(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue(['name' => 'Discover Cafe']);
        $deletedVenue = $this->createVenue(['name' => 'Closed Cafe']);
        $deletedVenue->delete();
        $this->createCustomer($venue, $user);

        Sanctum::actingAs($user);

        $this->getJson('/api/venues/discover')
            ->assertOk()
            ->assertJsonCount(1, 'venues')
            ->assertJsonPath('venues.0.name', 'Discover Cafe')
            ->assertJsonPath('venues.0.joined_count', 1);
    }

    public function test_public_landing_returns_venue_and_milestones(): void
    {
        $venue = $this->createVenue([
            'slug' => 'landing-cafe',
            'address' => '12 Market Street, Toruń',
        ]);
        $this->createReward($venue, [
            'title' => 'Free Drink',
            'required_stamps' => 5,
            'reward_type' => 'milestone',
            'active' => true,
        ]);

        $this->getJson('/api/public/venues/landing-cafe/landing')
            ->assertOk()
            ->assertJsonPath('venue.slug', 'landing-cafe')
            ->assertJsonPath('venue.address', '12 Market Street, Toruń')
            ->assertJsonCount(1, 'milestones')
            ->assertJsonPath('milestones.0.title', 'Free Drink');
    }

    public function test_public_landing_returns_not_found_for_missing_slug(): void
    {
        $this->getJson('/api/public/venues/missing-slug/landing')
            ->assertNotFound();
    }

    public function test_current_returns_active_venue(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $owner->forceFill(['active_venue_id' => $venue->id])->save();

        Sanctum::actingAs($owner);

        $this->getJson('/api/venues/current')
            ->assertOk()
            ->assertJsonPath('venue.id', $venue->id);
    }

    public function test_owner_can_view_update_select_and_delete_venue(): void
    {
        $owner = $this->createUser();
        $venueA = $this->createVenue(['name' => 'First Cafe']);
        $venueB = $this->createVenue(['name' => 'Second Cafe']);
        $this->attachMember($venueA, $owner, 'owner');
        $this->attachMember($venueB, $owner, 'owner');
        $owner->forceFill(['active_venue_id' => $venueA->id])->save();

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venueA->id}")
            ->assertOk()
            ->assertJsonPath('venue.customers_count', 0);

        $this->putJson("/api/venues/{$venueA->id}", [
            'name' => 'Updated Cafe',
            'phone' => '555-0100',
            'website' => 'https://example.com',
        ])
            ->assertOk()
            ->assertJsonPath('venue.name', 'Updated Cafe')
            ->assertJsonPath('venue.phone', '555-0100');

        $this->postJson("/api/venues/{$venueB->id}/select")
            ->assertOk()
            ->assertJsonPath('venue.id', $venueB->id);

        $this->assertSame($venueB->id, $owner->fresh()->active_venue_id);

        $this->deleteJson("/api/venues/{$venueA->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('venues', ['id' => $venueA->id]);
        $this->assertSame($venueB->id, $owner->fresh()->active_venue_id);
    }

    public function test_destroying_active_venue_switches_to_remaining_membership(): void
    {
        $owner = $this->createUser();
        $venueA = $this->createVenue(['name' => 'Active Cafe']);
        $venueB = $this->createVenue(['name' => 'Fallback Cafe']);
        $this->attachMember($venueA, $owner, 'owner');
        $this->attachMember($venueB, $owner, 'owner');
        $owner->forceFill(['active_venue_id' => $venueA->id])->save();

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venueA->id}")
            ->assertNoContent();

        $this->assertSame($venueB->id, $owner->fresh()->active_venue_id);
    }

    public function test_update_keeps_existing_slug_and_category_when_omitted(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue([
            'slug' => 'kept-slug',
            'category' => 'restaurant',
        ]);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->putJson("/api/venues/{$venue->id}", [
            'name' => 'Renamed Venue',
        ])
            ->assertOk()
            ->assertJsonPath('venue.slug', 'kept-slug')
            ->assertJsonPath('venue.category', 'restaurant');

        $this->putJson("/api/venues/{$venue->id}", [
            'name' => 'Renamed Again',
            'slug' => 'updated-slug',
            'category' => 'bar',
        ])
            ->assertOk()
            ->assertJsonPath('venue.slug', 'updated-slug')
            ->assertJsonPath('venue.category', 'bar');
    }

    public function test_staff_can_view_venue_and_customers(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 4]);
        $this->createVisit($customer, $staff);

        Sanctum::actingAs($staff);

        $this->getJson("/api/venues/{$venue->id}")->assertOk();

        $this->getJson("/api/venues/{$venue->id}/customers")
            ->assertOk()
            ->assertJsonCount(1, 'customers')
            ->assertJsonPath('customers.0.stamps', 4);
    }

    public function test_owner_can_upload_and_remove_logo_and_cover(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'media-cafe']);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $logoResponse = $this->post("/api/venues/{$venue->id}/logo", [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ], ['Accept' => 'application/json']);

        $logoResponse
            ->assertOk()
            ->assertJsonPath('venue.logo', fn (string $path): bool => str_starts_with($path, '/uploads/venue-logos/'))
            ->assertJsonPath('venue.logo_thumb', fn (?string $path): bool => is_string($path) && str_ends_with($path, '-thumb.jpg'));

        $logoPath = public_path(ltrim($logoResponse->json('venue.logo'), '/'));
        $this->assertFileExists($logoPath);
        $this->assertFileExists(public_path(ltrim($logoResponse->json('venue.logo_thumb'), '/')));

        $coverResponse = $this->post("/api/venues/{$venue->id}/cover", [
            'cover' => UploadedFile::fake()->image('cover.jpg'),
        ], ['Accept' => 'application/json']);

        $coverResponse
            ->assertOk()
            ->assertJsonPath('venue.cover_image', fn (string $path): bool => str_starts_with($path, '/uploads/venue-covers/'))
            ->assertJsonPath('venue.cover_image_thumb', fn (?string $path): bool => is_string($path) && str_ends_with($path, '-thumb.jpg'));

        $this->deleteJson("/api/venues/{$venue->id}/logo")
            ->assertOk()
            ->assertJsonPath('venue.logo', null);

        $this->deleteJson("/api/venues/{$venue->id}/cover")
            ->assertOk()
            ->assertJsonPath('venue.cover_image', null);

        File::delete($logoPath);
    }

    public function test_logo_upload_replaces_existing_local_file(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'replace-logo']);
        $this->attachMember($venue, $owner, 'owner');
        $venue->forceFill(['logo' => '/uploads/venue-logos/old.png'])->save();

        $directory = public_path('uploads/venue-logos');
        File::ensureDirectoryExists($directory);
        File::put("{$directory}/old.png", 'old');

        Sanctum::actingAs($owner);

        $this->post("/api/venues/{$venue->id}/logo", [
            'logo' => UploadedFile::fake()->image('new-logo.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $this->assertFileDoesNotExist("{$directory}/old.png");
    }

    public function test_destroy_logo_skips_external_paths(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'external-logo']);
        $this->attachMember($venue, $owner, 'owner');
        $venue->forceFill([
            'logo' => 'https://cdn.example.com/logo.png',
            'logo_thumb' => '/uploads/other/logo.png',
        ])->save();

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/logo")
            ->assertOk()
            ->assertJsonPath('venue.logo', null);
    }
}

