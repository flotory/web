<?php

namespace Tests\Feature;

use App\Models\Venue;
use App\Models\Brand;
use App\Models\VenueSetupFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueSetupFileControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_owner_can_upload_setup_files_without_kind(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['status' => Brand::STATUS_DRAFT]);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/setup-files", [
            'file' => UploadedFile::fake()->image('logo.png', 800, 800),
        ])->assertCreated()
            ->assertJsonPath('file.kind', VenueSetupFile::KIND_FILE);

        $this->postJson("/api/venues/{$venue->id}/setup-files", [
            'file' => UploadedFile::fake()->create('menu.pdf', 120, 'application/pdf'),
        ])->assertCreated()
            ->assertJsonPath('file.kind', VenueSetupFile::KIND_FILE);

        $this->getJson("/api/venues/{$venue->id}/setup-files")
            ->assertOk()
            ->assertJsonPath('requirements.files_uploaded', true)
            ->assertJsonPath('requirements.file_count', 2);
    }

    public function test_listing_requires_at_least_one_setup_file(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue([
            'status' => Brand::STATUS_DRAFT,
            'category' => 'cafe',
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);
        $this->attachMember($venue, $owner, 'owner');
        $venue->brand->forceFill(['logo' => $this->ownerMediaPath($owner, $venue->brand, 'logos', 'demo.png')])->save();
        $this->createReward($venue);

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venue->id}/listing")
            ->assertOk()
            ->assertJsonPath('listing.ready_to_submit', false);

        $this->postJson("/api/venues/{$venue->id}/setup-files", [
            'file' => UploadedFile::fake()->image('logo.png'),
        ]);

        $this->getJson("/api/venues/{$venue->id}/listing")
            ->assertOk()
            ->assertJsonPath('listing.ready_to_submit', true);
    }

    public function test_admin_cannot_approve_without_final_logo_even_with_setup_files(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser(['email' => 'setup-owner@example.com']);
        $venue = $this->createVenue([
            'status' => Brand::STATUS_PENDING_REVIEW,
            'category' => 'cafe',
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);
        $this->attachMember($venue, $owner, 'owner');
        $this->createReward($venue);

        VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'logo.png',
            'path' => $this->ownerMediaPath($owner, $venue->brand, 'setup', 'logo.png'),
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/venues/{$venue->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listing']);
    }

    public function test_admin_can_list_setup_files_for_brand(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser(['email' => 'admin-files@example.com']);
        $venue = $this->createVenue(['status' => Brand::STATUS_PENDING_REVIEW]);
        $this->attachMember($venue, $owner, 'owner');

        VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'menu.pdf',
            'path' => $this->ownerMediaPath($owner, $venue->brand, 'setup', 'menu.pdf'),
            'mime_type' => 'application/pdf',
            'byte_size' => 2048,
        ]);

        $venue->brand->forceFill(['logo' => $this->ownerMediaPath($owner, $venue->brand, 'logos', 'demo.png')])->save();

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/manage-venues/{$venue->id}/setup-files")
            ->assertOk()
            ->assertJsonPath('requirements.files_uploaded', true)
            ->assertJsonPath('requirements.file_count', 1)
            ->assertJsonPath('requirements.final_logo_applied', true)
            ->assertJsonPath('requirements.final_cover_applied', false);
    }

    public function test_admin_can_upload_and_delete_setup_files(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser(['email' => 'admin-upload-owner@example.com']);
        $venue = $this->createPublishedVenue(['slug' => 'admin-upload-files']);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($admin);

        $create = $this->postJson("/api/admin/manage-venues/{$venue->id}/setup-files", [
            'file' => UploadedFile::fake()->image('logo.png'),
        ])->assertCreated();

        $fileId = $create->json('file.id');

        $this->getJson("/api/admin/manage-venues/{$venue->id}/setup-files")
            ->assertOk()
            ->assertJsonPath('requirements.file_count', 1);

        $this->deleteJson("/api/admin/manage-venues/{$venue->id}/setup-files/{$fileId}")
            ->assertNoContent();

        $this->getJson("/api/admin/manage-venues/{$venue->id}/setup-files")
            ->assertOk()
            ->assertJsonPath('requirements.file_count', 0);
    }

    public function test_owner_can_upload_but_not_delete_files_when_brand_is_published(): void
    {
        $owner = $this->createUser();
        $venue = $this->createPublishedVenue(['name' => 'Live Files Cafe', 'slug' => 'live-files-cafe']);
        $this->attachMember($venue, $owner, 'owner');

        $existing = VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'logo.png',
            'path' => $this->ownerMediaPath($owner, $venue->brand, 'setup', 'logo.png'),
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/setup-files", [
            'file' => UploadedFile::fake()->image('cover.jpg'),
        ])
            ->assertCreated();

        $this->deleteJson("/api/venues/{$venue->id}/setup-files/{$existing->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }

    public function test_owner_can_delete_setup_files_on_draft_brand(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['status' => Brand::STATUS_DRAFT]);
        $this->attachMember($venue, $owner, 'owner');

        $file = VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'logo.png',
            'path' => $this->ownerMediaPath($owner, $venue->brand, 'setup', 'logo.png'),
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/setup-files/{$file->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('venue_setup_files', ['id' => $file->id]);
    }

    public function test_owner_cannot_delete_setup_files_when_brand_is_pending_review(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['status' => Brand::STATUS_PENDING_REVIEW]);
        $this->attachMember($venue, $owner, 'owner');

        $file = VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'logo.png',
            'path' => $this->ownerMediaPath($owner, $venue->brand, 'setup', 'logo.png'),
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$venue->id}/setup-files/{$file->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    }
}
