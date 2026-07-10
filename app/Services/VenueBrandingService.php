<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Venue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class VenueBrandingService
{
    private const LOGO_DIRECTORY = 'uploads/venue-logos';

    private const COVER_DIRECTORY = 'uploads/venue-covers';

    public function __construct(
        private ImageThumbnailService $images,
        private MediaStorageService $media,
    ) {}

    public function applyLogo(Venue $venue, UploadedFile $file): Venue
    {
        $brand = $this->brandFor($venue);
        $this->deleteLogo($brand);

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'png');
        $filename = Str::slug($venue->slug).'-'.Str::lower(Str::random(12)).'.'.$extension;

        $stored = $this->images->storeWithThumbnail(
            $file,
            self::LOGO_DIRECTORY,
            $filename,
            ImageThumbnailService::THUMB_MAX_LOGO,
        );

        $brand->forceFill([
            'logo' => $stored['path'],
            'logo_thumb' => $stored['thumb_path'],
        ])->save();

        return $venue->fresh(['brand']);
    }

    public function clearLogo(Venue $venue): Venue
    {
        $brand = $this->brandFor($venue);
        $this->deleteLogo($brand);

        $brand->forceFill([
            'logo' => null,
            'logo_thumb' => null,
        ])->save();

        return $venue->fresh(['brand']);
    }

    public function applyCover(Venue $venue, UploadedFile $file): Venue
    {
        $brand = $this->brandFor($venue);
        $this->deleteCover($brand);

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $filename = Str::slug($venue->slug).'-cover-'.Str::lower(Str::random(12)).'.'.$extension;

        $stored = $this->images->storeWithThumbnail(
            $file,
            self::COVER_DIRECTORY,
            $filename,
            ImageThumbnailService::THUMB_MAX_COVER,
        );

        $brand->forceFill([
            'cover_image' => $stored['path'],
            'cover_image_thumb' => $stored['thumb_path'],
        ])->save();

        return $venue->fresh(['brand']);
    }

    public function clearCover(Venue $venue): Venue
    {
        $brand = $this->brandFor($venue);
        $this->deleteCover($brand);

        $brand->forceFill([
            'cover_image' => null,
            'cover_image_thumb' => null,
        ])->save();

        return $venue->fresh(['brand']);
    }

    private function brandFor(Venue $venue): Brand
    {
        $venue->loadMissing('brand');

        return $venue->brand;
    }

    private function deleteLogo(Brand $brand): void
    {
        foreach ([$brand->logo, $brand->logo_thumb] as $path) {
            $this->media->delete($path);
        }

        if ($brand->logo) {
            $this->images->deleteThumbnailFor($brand->logo);
        }
    }

    private function deleteCover(Brand $brand): void
    {
        foreach ([$brand->cover_image, $brand->cover_image_thumb] as $path) {
            $this->media->delete($path);
        }

        if ($brand->cover_image) {
            $this->images->deleteThumbnailFor($brand->cover_image);
        }
    }
}
