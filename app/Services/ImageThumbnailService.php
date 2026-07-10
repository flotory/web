<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class ImageThumbnailService
{
    public const THUMB_MAX_LOGO = 256;

    public const THUMB_MAX_REWARD = 320;

    public const THUMB_MAX_COVER = 640;

    public function __construct(private MediaStorageService $media) {}

    /**
     * @return array{path: string, thumb_path: string|null}
     */
    public function storeWithThumbnail(
        UploadedFile $file,
        string $storageDirectory,
        string $filename,
        int $thumbMaxSize = self::THUMB_MAX_REWARD,
    ): array {
        $relativePath = $this->media->putUploadedFile($file, $storageDirectory, $filename);

        try {
            $thumbPath = $this->createThumbnail($relativePath, $thumbMaxSize);
        } catch (\Throwable) {
            $thumbPath = null;
        }

        return [
            'path' => $relativePath,
            'thumb_path' => $thumbPath,
        ];
    }

    public function createThumbnailFromExisting(string $publicRelativePath, int $thumbMaxSize): ?string
    {
        if (! $this->media->isManagedPath($publicRelativePath)) {
            return null;
        }

        return $this->createThumbnail($publicRelativePath, $thumbMaxSize);
    }

    public function thumbPathFor(string $publicRelativePath): string
    {
        $directory = dirname($publicRelativePath);
        $filename = basename($publicRelativePath);
        $base = pathinfo($filename, PATHINFO_FILENAME);

        return "{$directory}/{$base}-thumb.jpg";
    }

    public function deleteThumbnailFor(?string $publicRelativePath): void
    {
        if (! $publicRelativePath || ! $this->media->isManagedPath($publicRelativePath)) {
            return;
        }

        $this->media->delete($this->thumbPathFor($publicRelativePath));
    }

    private function createThumbnail(string $publicRelativePath, int $maxSize): ?string
    {
        if (! $this->gdIsAvailable()) {
            return null;
        }

        $sourcePath = $this->media->localPathForProcessing($publicRelativePath);

        if ($sourcePath === null) {
            return null;
        }

        try {
            $size = @getimagesize($sourcePath);

            if ($size === false) {
                return null;
            }

            [$width, $height, $type] = $size;
            $source = $this->loadImage($sourcePath, $type);

            if ($source === null) {
                return null;
            }

            $scale = min($maxSize / max($width, 1), $maxSize / max($height, 1), 1);
            $targetWidth = max(1, (int) round($width * $scale));
            $targetHeight = max(1, (int) round($height * $scale));

            $target = imagecreatetruecolor($targetWidth, $targetHeight);
            imagealphablending($target, false);
            imagesavealpha($target, true);
            $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
            imagefill($target, 0, 0, $transparent);
            imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);
            imagedestroy($source);

            $thumbRelative = $this->thumbPathFor($publicRelativePath);
            $thumbDirectory = trim(dirname($this->media->toStorageKey($thumbRelative)), '/');
            $thumbFilename = basename($thumbRelative);

            $tempThumb = tempnam(sys_get_temp_dir(), 'flotory-thumb-');

            if ($tempThumb === false) {
                imagedestroy($target);

                return null;
            }

            if (! @imagejpeg($target, $tempThumb, 82)) {
                imagedestroy($target);
                @unlink($tempThumb);

                return null;
            }

            imagedestroy($target);

            $storedThumb = $this->media->putContents(
                $thumbDirectory,
                $thumbFilename,
                (string) file_get_contents($tempThumb),
            );

            @unlink($tempThumb);

            return $storedThumb;
        } finally {
            $this->media->releaseTempPath($sourcePath, $publicRelativePath);
        }
    }

    private function loadImage(string $path, int $type): ?\GdImage
    {
        return match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path) ?: null,
            IMAGETYPE_PNG => @imagecreatefrompng($path) ?: null,
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
            IMAGETYPE_GIF => @imagecreatefromgif($path) ?: null,
            default => null,
        };
    }

    protected function gdIsAvailable(): bool
    {
        return extension_loaded('gd');
    }
}
