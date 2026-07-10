<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use App\Support\VenuePresenter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VenueSetupFileService
{
    private const MAX_BYTES = 10 * 1024 * 1024;

    public function __construct(
        private MediaStorageService $media,
        private OwnerMediaPathService $paths,
    ) {}

    /**
     * @return list<string>
     */
    public function allowedMimeTypes(): array
    {
        return [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
    }

    public function store(Venue $venue, User $user, UploadedFile $file): VenueSetupFile
    {
        $venue->loadMissing('brand');
        $brand = $venue->brand;

        $allowed = $this->allowedMimeTypes();
        $mime = $file->getMimeType() ?: $file->getClientMimeType() ?: 'application/octet-stream';

        if (! in_array($mime, $allowed, true)) {
            throw ValidationException::withMessages([
                'file' => 'This file type is not allowed. Use images, PDF, Word, or plain text.',
            ]);
        }

        if ($file->getSize() > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'file' => 'File is too large (max 10 MB).',
            ]);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $filename = Str::slug($venue->slug).'-file-'.Str::lower(Str::random(12)).'.'.$extension;
        $ownerId = $this->paths->ownerIdForBrand($brand, $user);
        $storageDirectory = $this->paths->setupDirectory($ownerId, $brand->id);

        $originalName = $file->getClientOriginalName();
        $byteSize = $file->getSize() ?: 0;
        $storedPath = $this->media->putUploadedFile($file, $storageDirectory, $filename);

        return VenueSetupFile::query()->create([
            'brand_id' => $brand->id,
            'uploaded_by_user_id' => $user->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => $originalName,
            'path' => $storedPath,
            'mime_type' => $mime,
            'byte_size' => $byteSize,
        ]);
    }

    public function delete(VenueSetupFile $setupFile): void
    {
        $this->media->delete($setupFile->path);

        $setupFile->delete();
    }

    public function hasAnyFiles(Brand $brand): bool
    {
        return $brand->setupFiles()->exists();
    }

    public function fileCount(Brand $brand): int
    {
        return $brand->setupFiles()->count();
    }

    /**
     * @param  iterable<int>  $brandIds
     * @return array<int, string>
     */
    public function logoPreviewPathsForBrandIds(iterable $brandIds): array
    {
        $ids = collect($brandIds)->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return [];
        }

        $paths = [];

        foreach (VenueSetupFile::query()
            ->whereIn('brand_id', $ids)
            ->where('mime_type', 'like', 'image/%')
            ->orderBy('created_at')
            ->get()
            ->groupBy('brand_id') as $brandId => $files) {
            $path = $this->resolveLogoPreviewFromFiles($files);

            if ($path !== null) {
                $paths[(int) $brandId] = $path;
            }
        }

        return $paths;
    }

    public function logoPreviewPathForBrand(Brand $brand): ?string
    {
        $paths = $this->logoPreviewPathsForBrandIds([$brand->id]);

        return $paths[$brand->id] ?? null;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, VenueSetupFile>  $files
     */
    private function resolveLogoPreviewFromFiles($files): ?string
    {
        $bestPath = null;
        $bestScore = PHP_FLOAT_MAX;

        foreach ($files as $file) {
            $path = VenuePresenter::resolvePublicUploadPath($file->path);

            if ($path === null) {
                continue;
            }

            $localPath = $this->media->localPathForProcessing($file->path);

            if ($localPath === null) {
                continue;
            }

            try {
                $score = $this->logoLikenessScore($file, $localPath);

                if ($score < $bestScore) {
                    $bestScore = $score;
                    $bestPath = $path;
                }
            } finally {
                $this->media->releaseTempPath($localPath, $file->path);
            }
        }

        return $bestPath;
    }

    private function logoLikenessScore(VenueSetupFile $file, string $absolutePath): float
    {
        $name = Str::lower($file->original_name);

        if (str_contains($name, 'logo')) {
            return -100;
        }

        if (str_contains($name, 'cover') || str_contains($name, 'banner') || str_contains($name, 'storefront')) {
            return 100;
        }

        $size = @getimagesize($absolutePath);

        if ($size === false) {
            return 50;
        }

        [$width, $height] = $size;

        if ($width <= 0 || $height <= 0) {
            return 50;
        }

        $ratio = $width / $height;

        return abs($ratio - 1) + ($ratio > 1.35 ? 5 : 0);
    }

    /**
     * @deprecated Use logoPreviewPathsForBrandIds()
     *
     * @param  iterable<int>  $brandIds
     * @return array<int, string>
     */
    public function previewImagePathsForBrandIds(iterable $brandIds): array
    {
        return $this->logoPreviewPathsForBrandIds($brandIds);
    }

    /**
     * @deprecated Use logoPreviewPathForBrand()
     */
    public function previewImagePathForBrand(Brand $brand): ?string
    {
        return $this->logoPreviewPathForBrand($brand);
    }

    /**
     * @return array<string, mixed>
     */
    public function present(VenueSetupFile $file): array
    {
        return [
            'id' => $file->id,
            'brand_id' => $file->brand_id,
            'kind' => $file->kind,
            'original_name' => $file->original_name,
            'path' => VenuePresenter::resolvePublicUploadPath($file->path) ?? $file->path,
            'mime_type' => $file->mime_type,
            'byte_size' => $file->byte_size,
            'is_image' => $file->isImage(),
            'uploaded_at' => $file->created_at?->toIso8601String(),
            'uploader' => $file->relationLoaded('uploader') && $file->uploader ? [
                'id' => $file->uploader->id,
                'name' => $file->uploader->name,
                'email' => $file->uploader->email,
            ] : null,
        ];
    }
}
