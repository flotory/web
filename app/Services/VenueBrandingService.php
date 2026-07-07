<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Venue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class VenueBrandingService
{
    public function __construct(private ImageThumbnailService $images) {}

    public function applyLogo(Venue $venue, UploadedFile $file): Venue
    {
        $brand = $this->brandFor($venue);
        $this->deleteLocalLogo($brand);

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'png');
        $filename = Str::slug($venue->slug).'-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-logos');

        $stored = $this->images->storeWithThumbnail(
            $file,
            $directory,
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
        $this->deleteLocalLogo($brand);

        $brand->forceFill([
            'logo' => null,
            'logo_thumb' => null,
        ])->save();

        return $venue->fresh(['brand']);
    }

    public function applyCover(Venue $venue, UploadedFile $file): Venue
    {
        $brand = $this->brandFor($venue);
        $this->deleteLocalCover($brand);

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $filename = Str::slug($venue->slug).'-cover-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-covers');

        $stored = $this->images->storeWithThumbnail(
            $file,
            $directory,
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
        $this->deleteLocalCover($brand);

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

    private function deleteLocalLogo(Brand $brand): void
    {
        foreach ([$brand->logo, $brand->logo_thumb] as $path) {
            if (! $path || ! str_starts_with($path, '/uploads/venue-logos/')) {
                continue;
            }

            File::delete(public_path(ltrim($path, '/')));
        }

        if ($brand->logo) {
            $this->images->deleteThumbnailFor($brand->logo);
        }
    }

    private function deleteLocalCover(Brand $brand): void
    {
        foreach ([$brand->cover_image, $brand->cover_image_thumb] as $path) {
            if (! $path || ! str_starts_with($path, '/uploads/venue-covers/')) {
                continue;
            }

            File::delete(public_path(ltrim($path, '/')));
        }

        if ($brand->cover_image) {
            $this->images->deleteThumbnailFor($brand->cover_image);
        }
    }
}
