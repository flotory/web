<?php

namespace Tests\Unit;

use App\Support\VenuePresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenuePresenterTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_attributes_omit_missing_local_upload_paths(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue([
            'name' => 'Missing Media Cafe',
            'slug' => 'missing-media-cafe',
        ]);
        $this->attachMember($venue, $owner, 'owner');

        $venue->brand->forceFill([
            'logo' => $this->ownerMediaPath($owner, $venue->brand, 'logos', 'missing-logo.png'),
            'logo_thumb' => $this->ownerMediaPath($owner, $venue->brand, 'logos', 'missing-logo-thumb.jpg'),
            'cover_image' => $this->ownerMediaPath($owner, $venue->brand, 'covers', 'missing-cover.jpg'),
            'cover_image_thumb' => $this->ownerMediaPath($owner, $venue->brand, 'covers', 'missing-cover-thumb.jpg'),
        ])->save();

        $presented = VenuePresenter::attributes($venue);

        $this->assertNull($presented['logo']);
        $this->assertNull($presented['logo_thumb']);
        $this->assertNull($presented['cover_image']);
        $this->assertNull($presented['cover_image_thumb']);
    }

    public function test_attributes_keep_existing_local_upload_paths(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue([
            'name' => 'Stored Media Cafe',
            'slug' => 'stored-media-cafe',
        ]);
        $this->attachMember($venue, $owner, 'owner');

        $logoPath = $this->ownerMediaPath($owner, $venue->brand, 'logos', 'stored-logo.png');
        $logoThumbPath = $this->ownerMediaPath($owner, $venue->brand, 'logos', 'stored-logo-thumb.jpg');
        $this->ensurePublicUploadFile($logoPath, 'logo');
        $this->ensurePublicUploadFile($logoThumbPath, 'thumb');

        $venue->brand->forceFill([
            'logo' => $logoPath,
            'logo_thumb' => $logoThumbPath,
        ])->save();

        $presented = VenuePresenter::attributes($venue);

        $this->assertSame($logoPath, $presented['logo']);
        $this->assertSame($logoThumbPath, $presented['logo_thumb']);
    }

    public function test_attributes_include_setup_logo_preview_when_logo_not_applied(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['name' => 'Preview Cafe', 'slug' => 'preview-cafe']);
        $this->attachMember($venue, $owner, 'owner');

        $previewPath = $this->ownerMediaPath($owner, $venue->brand, 'setup', 'preview.png');
        $this->ensurePublicUploadFile($previewPath, 'image');

        \App\Models\VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => \App\Models\VenueSetupFile::KIND_FILE,
            'original_name' => 'preview.png',
            'path' => $previewPath,
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        $presented = VenuePresenter::attributes($venue);

        $this->assertNull($presented['logo']);
        $this->assertSame($previewPath, $presented['setup_logo_preview']);
    }

    public function test_setup_logo_preview_prefers_logo_named_file_over_cover(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['name' => 'Logo Pick Cafe', 'slug' => 'logo-pick-cafe']);
        $this->attachMember($venue, $owner, 'owner');

        $coverPath = $this->ownerMediaPath($owner, $venue->brand, 'setup', 'cover.jpg');
        $logoPath = $this->ownerMediaPath($owner, $venue->brand, 'setup', 'logo.png');
        $this->ensurePublicUploadFile($coverPath, 'cover');
        $this->ensurePublicUploadFile($logoPath, 'logo');

        \App\Models\VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => \App\Models\VenueSetupFile::KIND_FILE,
            'original_name' => 'cover.jpg',
            'path' => $coverPath,
            'mime_type' => 'image/jpeg',
            'byte_size' => 1024,
        ]);

        \App\Models\VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => \App\Models\VenueSetupFile::KIND_FILE,
            'original_name' => 'logo.png',
            'path' => $logoPath,
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        $presented = VenuePresenter::attributes($venue);

        $this->assertSame($logoPath, $presented['setup_logo_preview']);
    }
}
