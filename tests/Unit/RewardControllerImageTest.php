<?php

namespace Tests\Unit;

use App\Models\Reward;
use App\Services\ImageThumbnailService;
use App\Services\MediaStorageService;
use App\Services\OwnerMediaPathService;
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
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'image-unit']);
        $this->attachMember($venue, $owner, 'owner');
        $file = UploadedFile::fake()->create('reward.bmp', 100, 'image/bmp');

        $this->expectException(ValidationException::class);

        app(RewardImageService::class)->store($file, $venue, null, $owner);
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
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $imagePath = $this->ownerMediaPath($owner, $venue->brand, 'rewards', 'local.jpg');
        $this->ensurePublicUploadFile($imagePath);

        $reward = $this->createReward($venue, [
            'image' => $imagePath,
        ]);

        app(RewardImageService::class)->delete($reward);

        $this->assertFileDoesNotExist(public_path(ltrim($imagePath, '/')));
    }

    public function test_store_reward_image_reports_storage_failures(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'move-failure']);
        $this->attachMember($venue, $owner, 'owner');
        $file = UploadedFile::fake()->image('reward.jpg', 100, 100);

        $images = \Mockery::mock(ImageThumbnailService::class);
        $images->shouldReceive('storeWithThumbnail')
            ->once()
            ->andThrow(new \RuntimeException('disk full'));

        $service = new RewardImageService(
            $images,
            app(MediaStorageService::class),
            app(OwnerMediaPathService::class),
        );

        $this->expectException(ValidationException::class);

        $service->store($file, $venue, null, $owner);
    }

    public function test_store_reward_image_skips_writable_check_on_remote_disk(): void
    {
        Storage::fake('s3');
        config(['filesystems.media_disk' => 's3']);

        $owner = $this->createUser();
        $venue = $this->createVenue(['slug' => 'remote-upload']);
        $this->attachMember($venue, $owner, 'owner');
        $file = UploadedFile::fake()->image('reward.jpg', 100, 100);

        $stored = app(RewardImageService::class)->store($file, $venue, null, $owner);

        $this->assertStringStartsWith('/uploads/owners/', $stored['image']);
        Storage::disk('s3')->assertExists(ltrim($stored['image'], '/'));
    }
}
