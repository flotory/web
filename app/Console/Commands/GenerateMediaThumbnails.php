<?php

namespace App\Console\Commands;

use App\Models\Reward;
use App\Models\Venue;
use App\Services\ImageThumbnailService;
use Illuminate\Console\Command;

class GenerateMediaThumbnails extends Command
{
    protected $signature = 'media:generate-thumbs {--force : Regenerate even when a thumb path already exists}';

    protected $description = 'Generate missing image thumbnails for rewards and venues';

    public function handle(ImageThumbnailService $images): int
    {
        $force = (bool) $this->option('force');
        $generated = 0;

        Reward::query()
            ->whereNotNull('image')
            ->orderBy('id')
            ->each(function (Reward $reward) use ($images, $force, &$generated): void {
                if (! $force && filled($reward->image_thumb)) {
                    return;
                }

                $thumb = $images->createThumbnailFromExisting(
                    (string) $reward->image,
                    ImageThumbnailService::THUMB_MAX_REWARD,
                );

                if (! $thumb) {
                    return;
                }

                $reward->forceFill(['image_thumb' => $thumb])->save();
                $generated++;
            });

        Venue::query()
            ->withTrashed()
            ->orderBy('id')
            ->each(function (Venue $venue) use ($images, $force, &$generated): void {
                if ($venue->logo && ($force || blank($venue->logo_thumb))) {
                    $thumb = $images->createThumbnailFromExisting(
                        (string) $venue->logo,
                        ImageThumbnailService::THUMB_MAX_LOGO,
                    );

                    if ($thumb) {
                        $venue->forceFill(['logo_thumb' => $thumb])->save();
                        $generated++;
                    }
                }

                if ($venue->cover_image && ($force || blank($venue->cover_image_thumb))) {
                    $thumb = $images->createThumbnailFromExisting(
                        (string) $venue->cover_image,
                        ImageThumbnailService::THUMB_MAX_COVER,
                    );

                    if ($thumb) {
                        $venue->forceFill(['cover_image_thumb' => $thumb])->save();
                        $generated++;
                    }
                }
            });

        $this->info("Generated {$generated} thumbnail(s).");

        return self::SUCCESS;
    }
}
