<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class OwnerMediaPathService
{
    public function draftsDirectory(int $ownerId): string
    {
        return "uploads/owners/{$ownerId}/drafts";
    }

    public function logosDirectory(int $ownerId, int $brandId): string
    {
        return "uploads/owners/{$ownerId}/brands/{$brandId}/logos";
    }

    public function coversDirectory(int $ownerId, int $brandId): string
    {
        return "uploads/owners/{$ownerId}/brands/{$brandId}/covers";
    }

    public function rewardsDirectory(int $ownerId, int $brandId): string
    {
        return "uploads/owners/{$ownerId}/brands/{$brandId}/rewards";
    }

    public function setupDirectory(int $ownerId, int $brandId): string
    {
        return "uploads/owners/{$ownerId}/brands/{$brandId}/setup";
    }

    public function ownerIdForBrand(Brand $brand, ?User $actor = null): int
    {
        if ($actor !== null) {
            $isOwner = BrandUser::query()
                ->where('brand_id', $brand->id)
                ->where('user_id', $actor->id)
                ->where('role', 'owner')
                ->exists();

            if ($isOwner) {
                return $actor->id;
            }
        }

        $ownerId = BrandUser::query()
            ->where('brand_id', $brand->id)
            ->where('role', 'owner')
            ->orderBy('id')
            ->value('user_id');

        if ($ownerId !== null) {
            return (int) $ownerId;
        }

        throw ValidationException::withMessages([
            'file' => ['Assign an owner to this venue before uploading files.'],
        ]);
    }
}
