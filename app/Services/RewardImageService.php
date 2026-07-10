<?php

namespace App\Services;

use App\Models\Reward;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RewardImageService
{
    public function __construct(
        private ImageThumbnailService $images,
        private MediaStorageService $media,
        private OwnerMediaPathService $paths,
    ) {}

    /**
     * @return array{image: string, image_thumb: string|null}
     */
    public function store(UploadedFile $file, Venue $venue, ?Reward $reward = null, ?User $actor = null): array
    {
        $venue->loadMissing('brand');
        $brand = $venue->brand;
        $ownerId = $this->paths->ownerIdForBrand($brand, $actor);
        $storageDirectory = $this->paths->rewardsDirectory($ownerId, $brand->id);

        if (! $this->media->usesRemoteDisk()) {
            $directory = public_path($storageDirectory);

            if (! File::isDirectory($directory) && ! File::makeDirectory($directory, 0755, true) && ! File::isDirectory($directory)) {
                throw ValidationException::withMessages([
                    'image' => ['Upload folder is not writable on the server. Please contact support.'],
                ]);
            }

            if (! File::isWritable($directory)) {
                throw ValidationException::withMessages([
                    'image' => ['Upload folder is not writable on the server. Please contact support.'],
                ]);
            }
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (! in_array($extension, $allowed, true)) {
            throw ValidationException::withMessages([
                'image' => ['Use JPG, PNG, WEBP, or GIF. iPhone HEIC photos are not supported — choose Most Compatible in Camera settings.'],
            ]);
        }

        $seed = $reward?->id ? "{$reward->id}-{$venue->slug}" : $venue->slug;
        $filename = Str::slug($seed).'-'.Str::lower(Str::random(12)).'.'.$extension;

        try {
            $stored = $this->images->storeWithThumbnail(
                $file,
                $storageDirectory,
                $filename,
                ImageThumbnailService::THUMB_MAX_REWARD,
            );
        } catch (\Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'image' => ['The image could not be saved. Try a smaller JPG or PNG under 5 MB.'],
            ]);
        }

        return [
            'image' => $stored['path'],
            'image_thumb' => $stored['thumb_path'],
        ];
    }

    public function delete(Reward $reward): void
    {
        foreach ([$reward->image, $reward->image_thumb ?? null] as $path) {
            $this->media->delete($path);
        }

        if ($reward->image) {
            $this->images->deleteThumbnailFor($reward->image);
        }
    }
}
