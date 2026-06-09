<?php

namespace App\Services;

use App\Models\Venue;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class VenueBrandingService
{
    public function __construct(private ImageThumbnailService $images) {}

    public function applyLogo(Venue $venue, UploadedFile $file): Venue
    {
        $this->deleteLocalLogo($venue);

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'png');
        $filename = Str::slug($venue->slug).'-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-logos');

        $stored = $this->images->storeWithThumbnail(
            $file,
            $directory,
            $filename,
            ImageThumbnailService::THUMB_MAX_LOGO,
        );

        $venue->forceFill([
            'logo' => $stored['path'],
            'logo_thumb' => $stored['thumb_path'],
        ])->save();

        return $venue->fresh();
    }

    public function clearLogo(Venue $venue): Venue
    {
        $this->deleteLocalLogo($venue);

        $venue->forceFill([
            'logo' => null,
            'logo_thumb' => null,
        ])->save();

        return $venue->fresh();
    }

    public function applyCover(Venue $venue, UploadedFile $file): Venue
    {
        $this->deleteLocalCover($venue);

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $filename = Str::slug($venue->slug).'-cover-'.Str::lower(Str::random(12)).'.'.$extension;
        $directory = public_path('uploads/venue-covers');

        $stored = $this->images->storeWithThumbnail(
            $file,
            $directory,
            $filename,
            ImageThumbnailService::THUMB_MAX_COVER,
        );

        $venue->forceFill([
            'cover_image' => $stored['path'],
            'cover_image_thumb' => $stored['thumb_path'],
        ])->save();

        return $venue->fresh();
    }

    public function clearCover(Venue $venue): Venue
    {
        $this->deleteLocalCover($venue);

        $venue->forceFill([
            'cover_image' => null,
            'cover_image_thumb' => null,
        ])->save();

        return $venue->fresh();
    }

    private function deleteLocalLogo(Venue $venue): void
    {
        foreach ([$venue->logo, $venue->logo_thumb] as $path) {
            if (! $path || ! str_starts_with($path, '/uploads/venue-logos/')) {
                continue;
            }

            File::delete(public_path(ltrim($path, '/')));
        }

        if ($venue->logo) {
            $this->images->deleteThumbnailFor($venue->logo);
        }
    }

    private function deleteLocalCover(Venue $venue): void
    {
        foreach ([$venue->cover_image, $venue->cover_image_thumb] as $path) {
            if (! $path || ! str_starts_with($path, '/uploads/venue-covers/')) {
                continue;
            }

            File::delete(public_path(ltrim($path, '/')));
        }

        if ($venue->cover_image) {
            $this->images->deleteThumbnailFor($venue->cover_image);
        }
    }
}
