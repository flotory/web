<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ImageThumbnailService
{
    public const THUMB_MAX_LOGO = 256;

    public const THUMB_MAX_REWARD = 320;

    public const THUMB_MAX_COVER = 640;

    /**
     * @return array{path: string, thumb_path: string|null}
     */
    public function storeWithThumbnail(
        UploadedFile $file,
        string $absoluteDirectory,
        string $filename,
        int $thumbMaxSize = self::THUMB_MAX_REWARD,
    ): array {
        File::ensureDirectoryExists($absoluteDirectory);

        $file->move($absoluteDirectory, $filename);

        $relativePath = $this->relativePublicPath($absoluteDirectory, $filename);
        $fullPath = public_path(ltrim($relativePath, '/'));
        $thumbPath = $this->createThumbnail($fullPath, $thumbMaxSize);

        return [
            'path' => $relativePath,
            'thumb_path' => $thumbPath,
        ];
    }

    public function createThumbnailFromExisting(string $publicRelativePath, int $thumbMaxSize): ?string
    {
        if (! str_starts_with($publicRelativePath, '/uploads/')) {
            return null;
        }

        $fullPath = public_path(ltrim($publicRelativePath, '/'));

        if (! File::exists($fullPath)) {
            return null;
        }

        return $this->createThumbnail($fullPath, $thumbMaxSize);
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
        if (! $publicRelativePath || ! str_starts_with($publicRelativePath, '/uploads/')) {
            return;
        }

        $thumbPath = public_path(ltrim($this->thumbPathFor($publicRelativePath), '/'));

        if (File::exists($thumbPath)) {
            File::delete($thumbPath);
        }
    }

    private function createThumbnail(string $sourcePath, int $maxSize): ?string
    {
        if (! extension_loaded('gd')) {
            return null;
        }

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

        $thumbRelative = $this->thumbPathFor('/'.Str::after($sourcePath, public_path().'/'));
        $thumbAbsolute = public_path(ltrim($thumbRelative, '/'));

        File::ensureDirectoryExists(dirname($thumbAbsolute));

        if (! imagejpeg($target, $thumbAbsolute, 82)) {
            imagedestroy($target);

            return null;
        }

        imagedestroy($target);

        return $thumbRelative;
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

    private function relativePublicPath(string $absoluteDirectory, string $filename): string
    {
        $relativeDirectory = Str::after($absoluteDirectory, public_path());

        return rtrim($relativeDirectory, '/')."/{$filename}";
    }
}
