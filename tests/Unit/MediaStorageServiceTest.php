<?php

namespace Tests\Unit;

use App\Services\MediaStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaStorageServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Storage::fake('s3');
        parent::tearDown();
    }

    public function test_local_disk_returns_relative_upload_paths(): void
    {
        config(['filesystems.media_disk' => 'uploads']);

        $media = app(MediaStorageService::class);
        $stored = $media->putUploadedFile(
            UploadedFile::fake()->image('logo.png'),
            'uploads/venue-logos',
            'demo-logo.png',
        );

        $this->assertSame('/uploads/venue-logos/demo-logo.png', $stored);
        $this->assertFileExists(public_path('uploads/venue-logos/demo-logo.png'));
        $this->assertSame('/uploads/venue-logos/demo-logo.png', $media->url($stored));

        $media->delete($stored);
        $this->assertFileDoesNotExist(public_path('uploads/venue-logos/demo-logo.png'));
    }

    public function test_s3_disk_returns_public_urls(): void
    {
        Storage::fake('s3');
        config([
            'filesystems.media_disk' => 's3',
            'filesystems.disks.s3.url' => 'https://cdn.example.com',
        ]);

        $media = app(MediaStorageService::class);
        $stored = $media->putContents('uploads/reward-milestones', 'reward.jpg', 'image-bytes');

        $this->assertSame('/uploads/reward-milestones/reward.jpg', $stored);
        $this->assertNotNull($media->url($stored));
        Storage::disk('s3')->assertExists('uploads/reward-milestones/reward.jpg');
    }

    public function test_external_urls_are_preserved(): void
    {
        $media = app(MediaStorageService::class);

        $this->assertSame(
            'https://cdn.example.com/logo.png',
            $media->url('https://cdn.example.com/logo.png'),
        );
        $this->assertFalse($media->isManagedPath('https://cdn.example.com/logo.png'));
    }
}
