<?php

namespace Tests\Unit;

use App\Models\Reward;
use App\Services\ImageThumbnailService;
use App\Services\MediaStorageService;
use App\Services\RewardImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class RewardControllerImageTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    protected function tearDown(): void
    {
        \Mockery::close();

        parent::tearDown();
    }

    public function test_store_reward_image_rejects_disallowed_extension(): void
    {
        $venue = $this->createVenue(['slug' => 'image-unit']);
        $file = UploadedFile::fake()->create('reward.bmp', 100, 'image/bmp');

        $this->expectException(ValidationException::class);

        app(RewardImageService::class)->store($file, $venue);
    }

    public function test_delete_reward_image_skips_external_paths(): void
    {
        $venue = $this->createVenue();
        $reward = $this->createReward($venue, [
            'image' => 'https://cdn.example.com/reward.jpg',
            'image_thumb' => '/uploads/other/thumb.jpg',
        ]);

        app(RewardImageService::class)->delete($reward);

        $this->assertSame('https://cdn.example.com/reward.jpg', $reward->fresh()->image);
    }

    public function test_delete_reward_image_removes_local_file(): void
    {
        $venue = $this->createVenue();
        $directory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($directory);
        File::put("{$directory}/local.jpg", 'image');

        $reward = $this->createReward($venue, [
            'image' => '/uploads/reward-milestones/local.jpg',
        ]);

        app(RewardImageService::class)->delete($reward);

        $this->assertFileDoesNotExist("{$directory}/local.jpg");
    }

    public function test_store_reward_image_reports_storage_failures(): void
    {
        $venue = $this->createVenue(['slug' => 'move-failure']);
        $file = UploadedFile::fake()->image('reward.jpg', 100, 100);

        $images = \Mockery::mock(ImageThumbnailService::class);
        $images->shouldReceive('storeWithThumbnail')
            ->once()
            ->andThrow(new \RuntimeException('disk full'));

        $service = new RewardImageService($images, app(MediaStorageService::class));

        $this->expectException(ValidationException::class);

        $service->store($file, $venue);
    }

    public function test_store_reward_image_skips_writable_check_on_remote_disk(): void
    {
        Storage::fake('s3');
        config(['filesystems.media_disk' => 's3']);

        $venue = $this->createVenue(['slug' => 'remote-upload']);
        $file = UploadedFile::fake()->image('reward.jpg', 100, 100);

        $stored = app(RewardImageService::class)->store($file, $venue);

        $this->assertStringStartsWith('/uploads/reward-milestones/', $stored['image']);
        Storage::disk('s3')->assertExists(ltrim($stored['image'], '/'));
    }
}
