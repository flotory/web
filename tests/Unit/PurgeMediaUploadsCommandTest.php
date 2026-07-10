<?php

namespace Tests\Unit;

use App\Models\Brand;
use App\Models\Reward;
use App\Models\VenueSetupFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class PurgeMediaUploadsCommandTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_purge_deletes_local_uploads_and_clears_database_media_paths(): void
    {
        config(['filesystems.media_disk' => 'uploads']);

        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $logoPath = $this->ownerMediaPath($owner, $venue->brand, 'logos', 'purge-me.png');
        $this->ensurePublicUploadFile($logoPath, 'logo');
        $venue->brand->forceFill(['logo' => $logoPath, 'logo_thumb' => $logoPath])->save();
        $reward = $this->createReward($venue, [
            'image' => $this->ownerMediaPath($owner, $venue->brand, 'rewards', 'reward.jpg'),
        ]);
        $this->ensurePublicUploadFile($reward->image, 'reward');
        $this->createVenueSetupFile($venue, $owner);

        $this->artisan('media:purge', ['--clear-db' => true, '--force' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('Upload storage cleared');

        $this->assertFileDoesNotExist(public_path(ltrim($logoPath, '/')));
        $this->assertFileExists(public_path('uploads/owners/.gitkeep'));

        $venue->brand->refresh();
        $reward->refresh();

        $this->assertNull($venue->brand->logo);
        $this->assertNull($venue->brand->logo_thumb);
        $this->assertNull($reward->image);
        $this->assertSame(0, Brand::query()->whereNotNull('logo')->count());
        $this->assertSame(0, Reward::query()->whereNotNull('image')->count());
        $this->assertSame(0, VenueSetupFile::query()->count());
    }

    protected function tearDown(): void
    {
        File::ensureDirectoryExists(public_path('uploads/owners'));
        File::put(public_path('uploads/owners/.gitkeep'), '');

        parent::tearDown();
    }
}
