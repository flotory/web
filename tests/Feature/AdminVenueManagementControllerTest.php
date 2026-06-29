<?php

namespace Tests\Feature;

use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
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

    public function test_admin_cannot_change_slug_on_published_venue(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser(['email' => 'published-owner@example.com']);
        $venue = $this->createPublishedVenue([
            'name' => 'Published Harbor',
            'slug' => 'published-harbor',
        ]);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/manage-venues/{$venue->id}", [
            'name' => 'Published Harbor',
            'slug' => 'renamed-harbor',
            'category' => 'cafe',
            'address' => $venue->address,
            'latitude' => $venue->latitude,
            'longitude' => $venue->longitude,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('slug');

        $this->assertDatabaseHas('venues', [
            'id' => $venue->id,
            'slug' => 'published-harbor',
        ]);
    }

    public function test_admin_can_provision_venue_for_new_owner(): void
    {
        $admin = $this->createUser(['is_admin' => true]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/manage-venues', [
            'name' => 'Sales Harbor Cafe',
            'owner_email' => 'sales-owner@example.com',
            'owner_name' => 'Sales Owner',
            'category' => 'cafe',
        ])
            ->assertCreated()
            ->assertJsonPath('venue.name', 'Sales Harbor Cafe');

        $venueId = $response->json('venue.id');

        $this->assertDatabaseHas('users', [
            'email' => 'sales-owner@example.com',
            'name' => 'Sales Owner',
        ]);

        $owner = \App\Models\User::query()->where('email', 'sales-owner@example.com')->firstOrFail();

        $this->assertDatabaseHas('venue_users', [
            'venue_id' => $venueId,
            'user_id' => $owner->id,
            'role' => 'owner',
        ]);

        $this->assertSame($venueId, $owner->fresh()->active_venue_id);
    }

    public function test_non_admin_cannot_access_manage_venues_api(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson('/api/admin/manage-venues')->assertForbidden();
        $this->postJson('/api/admin/manage-venues', [
            'name' => 'Blocked',
            'owner_email' => 'blocked@example.com',
        ])->assertForbidden();
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

    public function test_admin_can_upload_and_remove_logo_and_cover(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue(['slug' => 'admin-media-cafe']);

        Sanctum::actingAs($admin);

        $logoResponse = $this->post("/api/admin/manage-venues/{$venue->id}/logo", [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ], ['Accept' => 'application/json']);

        $logoResponse
            ->assertOk()
            ->assertJsonPath('venue.logo', fn (string $path): bool => str_starts_with($path, '/uploads/venue-logos/'))
            ->assertJsonPath('venue.logo_thumb', fn (?string $path): bool => is_string($path) && str_ends_with($path, '-thumb.jpg'));

        $logoPath = public_path(ltrim($logoResponse->json('venue.logo'), '/'));
        $this->assertFileExists($logoPath);
        $this->assertFileExists(public_path(ltrim($logoResponse->json('venue.logo_thumb'), '/')));

        $coverResponse = $this->post("/api/admin/manage-venues/{$venue->id}/cover", [
            'cover' => UploadedFile::fake()->image('cover.jpg'),
        ], ['Accept' => 'application/json']);

        $coverResponse
            ->assertOk()
            ->assertJsonPath('venue.cover_image', fn (string $path): bool => str_starts_with($path, '/uploads/venue-covers/'))
            ->assertJsonPath('venue.cover_image_thumb', fn (?string $path): bool => is_string($path) && str_ends_with($path, '-thumb.jpg'));

        $this->deleteJson("/api/admin/manage-venues/{$venue->id}/logo")
            ->assertOk()
            ->assertJsonPath('venue.logo', null);

        $this->deleteJson("/api/admin/manage-venues/{$venue->id}/cover")
            ->assertOk()
            ->assertJsonPath('venue.cover_image', null);

        File::delete($logoPath);
    }

    public function test_admin_logo_upload_replaces_existing_local_file(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue(['slug' => 'admin-replace-logo']);
        $venue->forceFill(['logo' => '/uploads/venue-logos/old.png'])->save();

        $directory = public_path('uploads/venue-logos');
        File::ensureDirectoryExists($directory);
        File::put("{$directory}/old.png", 'old');

        Sanctum::actingAs($admin);

        $this->post("/api/admin/manage-venues/{$venue->id}/logo", [
            'logo' => UploadedFile::fake()->image('new-logo.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $this->assertFileDoesNotExist("{$directory}/old.png");
    }

    public function test_admin_destroy_logo_skips_external_paths(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue(['slug' => 'admin-external-logo']);
        $venue->forceFill([
            'logo' => 'https://cdn.example.com/logo.png',
            'logo_thumb' => '/uploads/other/logo.png',
        ])->save();

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/manage-venues/{$venue->id}/logo")
            ->assertOk()
            ->assertJsonPath('venue.logo', null);
    }
}
