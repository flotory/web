<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\OwnerOnboardingDraftFile;
use App\Models\Reward;
use App\Models\VenueSetupFile;
use App\Services\MediaStorageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class PurgeMediaUploadsCommand extends Command
{
    protected $signature = 'media:purge
                            {--clear-db : Clear uploaded media paths and setup/draft file records}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Delete all files under uploads/ on the media disk (local or S3)';

    public function handle(MediaStorageService $media): int
    {
        if (! $this->option('force') && ! $this->confirm('Delete ALL uploaded media under uploads/?', true)) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $deleted = $media->deletePrefix('uploads');

        if (! $media->usesRemoteDisk()) {
            File::ensureDirectoryExists(public_path('uploads/owners'));
            File::put(public_path('uploads/owners/.gitkeep'), '');
        }

        $this->info("Upload storage cleared ({$deleted} objects).");

        if ($this->option('clear-db')) {
            Brand::query()->update([
                'logo' => null,
                'logo_thumb' => null,
                'cover_image' => null,
                'cover_image_thumb' => null,
            ]);

            Reward::query()->update([
                'image' => null,
                'image_thumb' => null,
            ]);

            VenueSetupFile::query()->delete();
            OwnerOnboardingDraftFile::query()->delete();

            $this->info('Database media references cleared.');
        }

        return self::SUCCESS;
    }
}
