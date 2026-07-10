<?php

namespace App\Support;

use App\Models\Brand;
use App\Models\Venue;
use App\Services\MediaStorageService;
use App\Services\VenueSetupFileService;

final class VenuePresenter
{
    /**
     * Merge brand-level fields onto a venue payload for owner/guest APIs.
     *
     * @return array<string, mixed>
     */
    public static function attributes(Venue $venue, ?string $setupLogoPreview = null): array
    {
        $venue->loadMissing('brand');

        $brand = $venue->brand;
        if (! $brand instanceof Brand) {
            return $venue->toArray();
        }

        $base = $venue->toArray();
        unset($base['brand']);

        $logo = self::resolvePublicUploadPath($brand->logo);
        $logoThumb = self::resolvePublicUploadPath($brand->logo_thumb);

        return array_merge($base, [
            'brand_id' => $brand->id,
            'category' => $brand->category,
            'logo' => $logo,
            'logo_thumb' => $logoThumb,
            'cover_image' => self::resolvePublicUploadPath($brand->cover_image),
            'cover_image_thumb' => self::resolvePublicUploadPath($brand->cover_image_thumb),
            'setup_logo_preview' => ($logo || $logoThumb)
                ? null
                : ($setupLogoPreview ?? self::resolveSetupLogoPreview($brand)),
            'phone' => $brand->phone,
            'website' => $brand->website,
            'average_check_amount' => $brand->average_check_amount,
            'status' => $venue->is_primary
                ? ($brand->status ?? Brand::STATUS_DRAFT)
                : ($venue->location_status ?? Venue::LOCATION_STATUS_PENDING_REVIEW),
            'review_note' => $venue->is_primary
                ? $brand->review_note
                : $venue->location_review_note,
            'submitted_at' => $venue->is_primary
                ? $brand->submitted_at?->toIso8601String()
                : $venue->location_submitted_at?->toIso8601String(),
            'published_at' => $venue->is_primary
                ? $brand->published_at?->toIso8601String()
                : $venue->location_published_at?->toIso8601String(),
            'brand_name' => $brand->name,
            'brand_slug' => $brand->slug,
            'is_branch' => ! $venue->is_primary,
        ]);
    }

    public static function apply(Venue $venue, ?string $setupLogoPreview = null): Venue
    {
        foreach (self::attributes($venue, $setupLogoPreview) as $key => $value) {
            if (in_array($key, ['id', 'created_at', 'updated_at', 'deleted_at', 'brand'], true)) {
                continue;
            }

            $venue->setAttribute($key, $value);
        }

        return $venue;
    }

    public static function resolvePublicUploadPath(?string $path): ?string
    {
        return app(MediaStorageService::class)->url($path);
    }

    private static function resolveSetupLogoPreview(Brand $brand): ?string
    {
        return app(VenueSetupFileService::class)->logoPreviewPathForBrand($brand);
    }
}
