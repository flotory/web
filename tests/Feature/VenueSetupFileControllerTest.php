<?php

namespace Tests\Feature;

use App\Models\Venue;
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
        $venue = $this->createVenue(['status' => Venue::STATUS_DRAFT]);
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
            'status' => Venue::STATUS_DRAFT,
            'category' => 'cafe',
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
            'logo' => '/uploads/venue-logos/demo.png',
        ]);
        $this->attachMember($venue, $owner, 'owner');
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
            'status' => Venue::STATUS_PENDING_REVIEW,
            'category' => 'cafe',
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);
        $this->attachMember($venue, $owner, 'owner');
        $this->createReward($venue);

        VenueSetupFile::query()->create([
            'venue_id' => $venue->id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'logo.png',
            'path' => '/uploads/venue-setup/'.$venue->id.'/logo.png',
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/venues/{$venue->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listing']);
    }
}
