<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\RewardController;
use App\Models\Reward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use ReflectionMethod;
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

        $this->invokeStoreRewardImage($file, $venue, null);
    }

    public function test_delete_reward_image_skips_external_paths(): void
    {
        $venue = $this->createVenue();
        $reward = $this->createReward($venue, [
            'image' => 'https://cdn.example.com/reward.jpg',
            'image_thumb' => '/uploads/other/thumb.jpg',
        ]);

        $this->invokeDeleteRewardImage($reward);

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

        $this->invokeDeleteRewardImage($reward);

        $this->assertFileDoesNotExist("{$directory}/local.jpg");
    }

    public function test_store_reward_image_reports_move_failures(): void
    {
        $venue = $this->createVenue(['slug' => 'move-failure']);
        $file = \Mockery::mock(UploadedFile::class);
        $file->shouldReceive('getClientOriginalExtension')->andReturn('jpg');
        $file->shouldReceive('extension')->andReturn('jpg');
        $file->shouldReceive('move')->andThrow(new \RuntimeException('disk full'));

        $this->expectException(ValidationException::class);

        $this->invokeStoreRewardImage($file, $venue, null);
    }

    private function invokeStoreRewardImage(UploadedFile $file, $venue, ?Reward $reward): array
    {
        $method = new ReflectionMethod(RewardController::class, 'storeRewardImage');
        $method->setAccessible(true);

        return $method->invoke(app(RewardController::class), $file, $venue, $reward);
    }

    private function invokeDeleteRewardImage(Reward $reward): void
    {
        $method = new ReflectionMethod(RewardController::class, 'deleteRewardImage');
        $method->setAccessible(true);

        $method->invoke(app(RewardController::class), $reward);
    }
}
