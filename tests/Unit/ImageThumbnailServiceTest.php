<?php

namespace Tests\Unit;

use App\Services\ImageThumbnailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ImageThumbnailServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_with_thumbnail_writes_full_and_thumb_files(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required for thumbnail generation.');
        }

        $directory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($directory);

        $service = app(ImageThumbnailService::class);
        $stored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('reward.jpg', 800, 600),
            $directory,
            'test-reward.jpg',
            ImageThumbnailService::THUMB_MAX_REWARD,
        );

        $this->assertSame('/uploads/reward-milestones/test-reward.jpg', $stored['path']);
        $this->assertSame('/uploads/reward-milestones/test-reward-thumb.jpg', $stored['thumb_path']);
        $this->assertFileExists(public_path('uploads/reward-milestones/test-reward.jpg'));
        $this->assertFileExists(public_path('uploads/reward-milestones/test-reward-thumb.jpg'));

        File::delete(public_path('uploads/reward-milestones/test-reward.jpg'));
        File::delete(public_path('uploads/reward-milestones/test-reward-thumb.jpg'));
    }

    public function test_create_thumbnail_from_existing_updates_missing_thumb(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required for thumbnail generation.');
        }

        $directory = public_path('uploads/venue-logos');
        File::ensureDirectoryExists($directory);

        $service = app(ImageThumbnailService::class);
        $stored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('logo.png', 400, 400),
            $directory,
            'existing-logo.png',
            ImageThumbnailService::THUMB_MAX_LOGO,
        );

        File::delete(public_path(ltrim($stored['thumb_path'] ?? '', '/')));

        $thumb = $service->createThumbnailFromExisting(
            $stored['path'],
            ImageThumbnailService::THUMB_MAX_LOGO,
        );

        $this->assertSame('/uploads/venue-logos/existing-logo-thumb.jpg', $thumb);
        $this->assertFileExists(public_path('uploads/venue-logos/existing-logo-thumb.jpg'));

        File::delete(public_path('uploads/venue-logos/existing-logo.png'));
        File::delete(public_path('uploads/venue-logos/existing-logo-thumb.jpg'));
    }
}
