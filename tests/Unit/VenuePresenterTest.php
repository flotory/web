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
        $venue = $this->createVenue([
            'name' => 'Missing Media Cafe',
            'slug' => 'missing-media-cafe',
        ]);

        $venue->brand->forceFill([
            'logo' => '/uploads/venue-logos/missing-logo.png',
            'logo_thumb' => '/uploads/venue-logos/missing-logo-thumb.jpg',
            'cover_image' => '/uploads/venue-covers/missing-cover.jpg',
            'cover_image_thumb' => '/uploads/venue-covers/missing-cover-thumb.jpg',
        ])->save();

        $presented = VenuePresenter::attributes($venue);

        $this->assertNull($presented['logo']);
        $this->assertNull($presented['logo_thumb']);
        $this->assertNull($presented['cover_image']);
        $this->assertNull($presented['cover_image_thumb']);
    }

    public function test_attributes_keep_existing_local_upload_paths(): void
    {
        $venue = $this->createVenue([
            'name' => 'Stored Media Cafe',
            'slug' => 'stored-media-cafe',
        ]);

        $directory = public_path('uploads/venue-logos');
        File::ensureDirectoryExists($directory);
        File::put($directory.'/stored-logo.png', 'logo');
        File::put($directory.'/stored-logo-thumb.jpg', 'thumb');

        $venue->brand->forceFill([
            'logo' => '/uploads/venue-logos/stored-logo.png',
            'logo_thumb' => '/uploads/venue-logos/stored-logo-thumb.jpg',
        ])->save();

        $presented = VenuePresenter::attributes($venue);

        $this->assertSame('/uploads/venue-logos/stored-logo.png', $presented['logo']);
        $this->assertSame('/uploads/venue-logos/stored-logo-thumb.jpg', $presented['logo_thumb']);

        File::delete($directory.'/stored-logo.png');
        File::delete($directory.'/stored-logo-thumb.jpg');
    }

    public function test_attributes_include_setup_logo_preview_when_logo_not_applied(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['name' => 'Preview Cafe', 'slug' => 'preview-cafe']);
        $this->attachMember($venue, $owner, 'owner');

        $directory = public_path('uploads/venue-setup/'.$venue->brand_id);
        \Illuminate\Support\Facades\File::ensureDirectoryExists($directory);
        \Illuminate\Support\Facades\File::put($directory.'/preview.png', 'image');

        \App\Models\VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => \App\Models\VenueSetupFile::KIND_FILE,
            'original_name' => 'preview.png',
            'path' => '/uploads/venue-setup/'.$venue->brand_id.'/preview.png',
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ]);

        $presented = VenuePresenter::attributes($venue);

        $this->assertNull($presented['logo']);
        $this->assertSame('/uploads/venue-setup/'.$venue->brand_id.'/preview.png', $presented['setup_logo_preview']);

        \Illuminate\Support\Facades\File::delete($directory.'/preview.png');
    }

    public function test_setup_logo_preview_prefers_logo_named_file_over_cover(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['name' => 'Logo Pick Cafe', 'slug' => 'logo-pick-cafe']);
        $this->attachMember($venue, $owner, 'owner');

        $directory = public_path('uploads/venue-setup/'.$venue->brand_id);
        \Illuminate\Support\Facades\File::ensureDirectoryExists($directory);
        \Illuminate\Support\Facades\File::put($directory.'/cover.jpg', 'cover');
        \Illuminate\Support\Facades\File::put($directory.'/logo.png', 'logo');

        \App\Models\VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => \App\Models\VenueSetupFile::KIND_FILE,
            'original_name' => 'storefront-cover.jpg',
            'path' => '/uploads/venue-setup/'.$venue->brand_id.'/cover.jpg',
            'mime_type' => 'image/jpeg',
            'byte_size' => 2048,
            'created_at' => now()->subMinute(),
        ]);

        \App\Models\VenueSetupFile::query()->create([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $owner->id,
            'kind' => \App\Models\VenueSetupFile::KIND_FILE,
            'original_name' => 'brand-logo.png',
            'path' => '/uploads/venue-setup/'.$venue->brand_id.'/logo.png',
            'mime_type' => 'image/png',
            'byte_size' => 1024,
            'created_at' => now(),
        ]);

        $presented = VenuePresenter::attributes($venue);

        $this->assertSame('/uploads/venue-setup/'.$venue->brand_id.'/logo.png', $presented['setup_logo_preview']);

        \Illuminate\Support\Facades\File::delete($directory.'/cover.jpg');
        \Illuminate\Support\Facades\File::delete($directory.'/logo.png');
    }

    public function test_resolve_public_upload_path_keeps_external_urls(): void
    {
        $this->assertSame('https://cdn.example.com/logo.png', VenuePresenter::resolvePublicUploadPath('https://cdn.example.com/logo.png'));
    }
}
