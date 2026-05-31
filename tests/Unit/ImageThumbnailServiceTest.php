<?php

namespace Tests\Unit;

use App\Console\Commands\GenerateMediaThumbnails;
use App\Models\Reward;
use App\Models\Venue;
use App\Services\ImageThumbnailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class ImageThumbnailServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    protected function tearDown(): void
    {
        foreach ([
            public_path('uploads/reward-milestones'),
            public_path('uploads/venue-logos'),
            public_path('uploads/venue-covers'),
        ] as $directory) {
            if (File::isDirectory($directory)) {
                File::cleanDirectory($directory);
            }
        }

        parent::tearDown();
    }

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
    }

    public function test_thumb_path_for_uploaded_asset(): void
    {
        $service = app(ImageThumbnailService::class);

        $this->assertSame(
            '/uploads/reward-milestones/free-coffee-thumb.jpg',
            $service->thumbPathFor('/uploads/reward-milestones/free-coffee.webp'),
        );
    }

    public function test_create_thumbnail_from_existing_returns_null_for_external_paths(): void
    {
        $service = app(ImageThumbnailService::class);

        $this->assertNull($service->createThumbnailFromExisting(
            'https://cdn.example.com/logo.png',
            ImageThumbnailService::THUMB_MAX_LOGO,
        ));
    }

    public function test_create_thumbnail_from_existing_returns_null_for_missing_file(): void
    {
        $service = app(ImageThumbnailService::class);

        $this->assertNull($service->createThumbnailFromExisting(
            '/uploads/venue-logos/missing.png',
            ImageThumbnailService::THUMB_MAX_LOGO,
        ));
    }

    public function test_delete_thumbnail_for_removes_generated_thumb_file(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required for thumbnail generation.');
        }

        $directory = public_path('uploads/venue-covers');
        File::ensureDirectoryExists($directory);

        $service = app(ImageThumbnailService::class);
        $stored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('cover.jpg', 1200, 600),
            $directory,
            'hero-cover.jpg',
            ImageThumbnailService::THUMB_MAX_COVER,
        );

        $this->assertFileExists(public_path(ltrim($stored['thumb_path'] ?? '', '/')));

        $service->deleteThumbnailFor($stored['path']);

        $this->assertFileDoesNotExist(public_path('uploads/venue-covers/hero-cover-thumb.jpg'));
        $this->assertFileExists(public_path('uploads/venue-covers/hero-cover.jpg'));
    }

    public function test_generate_media_thumbnails_command_backfills_missing_reward_and_venue_thumbs(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required for thumbnail generation.');
        }

        $venue = $this->createVenue(['slug' => 'thumb-cafe']);
        $user = $this->createUser();
        $customer = $this->createCustomer($venue, $user);
        unset($customer);

        $rewardDirectory = public_path('uploads/reward-milestones');
        $logoDirectory = public_path('uploads/venue-logos');
        File::ensureDirectoryExists($rewardDirectory);
        File::ensureDirectoryExists($logoDirectory);

        $service = app(ImageThumbnailService::class);
        $rewardStored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('reward.jpg', 640, 480),
            $rewardDirectory,
            'reward-one.jpg',
        );
        $logoStored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('logo.png', 300, 300),
            $logoDirectory,
            'logo-one.png',
            ImageThumbnailService::THUMB_MAX_LOGO,
        );

        $reward = $this->createReward($venue, [
            'image' => $rewardStored['path'],
            'image_thumb' => null,
        ]);
        unset($reward);

        $venue->forceFill([
            'logo' => $logoStored['path'],
            'logo_thumb' => null,
        ])->save();

        $this->artisan(GenerateMediaThumbnails::class)
            ->expectsOutputToContain('Generated 2 thumbnail(s).')
            ->assertSuccessful();

        $venue->refresh();

        $this->assertSame('/uploads/reward-milestones/reward-one-thumb.jpg', Reward::query()->first()?->image_thumb);
        $this->assertSame('/uploads/venue-logos/logo-one-thumb.jpg', $venue->logo_thumb);
    }

    public function test_delete_thumbnail_for_ignores_null_and_external_paths(): void
    {
        $service = app(ImageThumbnailService::class);

        $service->deleteThumbnailFor(null);
        $service->deleteThumbnailFor('https://cdn.example.com/logo.png');

        $this->assertTrue(true);
    }

    public function test_generate_media_thumbnails_command_skips_existing_thumbs_without_force(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required for thumbnail generation.');
        }

        $venue = $this->createVenue(['slug' => 'skip-cafe']);
        $rewardDirectory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($rewardDirectory);

        $service = app(ImageThumbnailService::class);
        $rewardStored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('reward.jpg', 640, 480),
            $rewardDirectory,
            'reward-skip.jpg',
        );

        $this->createReward($venue, [
            'image' => $rewardStored['path'],
            'image_thumb' => $rewardStored['thumb_path'],
        ]);

        $this->artisan(GenerateMediaThumbnails::class)
            ->expectsOutputToContain('Generated 0 thumbnail(s).')
            ->assertSuccessful();
    }

    public function test_generate_media_thumbnails_command_backfills_cover_image_and_force_regenerates(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required for thumbnail generation.');
        }

        $venue = $this->createVenue(['slug' => 'cover-cafe']);
        $coverDirectory = public_path('uploads/venue-covers');
        File::ensureDirectoryExists($coverDirectory);

        $service = app(ImageThumbnailService::class);
        $coverStored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('cover.jpg', 1400, 700),
            $coverDirectory,
            'venue-cover.jpg',
            ImageThumbnailService::THUMB_MAX_COVER,
        );

        File::delete(public_path(ltrim($coverStored['thumb_path'] ?? '', '/')));

        $venue->forceFill([
            'cover_image' => $coverStored['path'],
            'cover_image_thumb' => null,
        ])->save();

        $this->artisan(GenerateMediaThumbnails::class)
            ->expectsOutputToContain('Generated 1 thumbnail(s).')
            ->assertSuccessful();

        $venue->refresh();
        $this->assertSame('/uploads/venue-covers/venue-cover-thumb.jpg', $venue->cover_image_thumb);

        $this->artisan(GenerateMediaThumbnails::class)
            ->expectsOutputToContain('Generated 0 thumbnail(s).')
            ->assertSuccessful();

        $this->artisan(GenerateMediaThumbnails::class, ['--force' => true])
            ->expectsOutputToContain('Generated 1 thumbnail(s).')
            ->assertSuccessful();
    }

    public function test_create_thumbnail_from_existing_supports_gif_source(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension is required for thumbnail generation.');
        }

        $directory = public_path('uploads/reward-milestones');
        File::ensureDirectoryExists($directory);

        $service = app(ImageThumbnailService::class);
        $stored = $service->storeWithThumbnail(
            UploadedFile::fake()->image('reward.gif', 200, 200),
            $directory,
            'animated-reward.gif',
        );

        $this->assertSame('/uploads/reward-milestones/animated-reward-thumb.jpg', $stored['thumb_path']);
        $this->assertFileExists(public_path('uploads/reward-milestones/animated-reward-thumb.jpg'));
    }
}
