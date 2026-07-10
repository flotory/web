<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class MediaStorageService
{
    public function diskName(): string
    {
        return (string) config('filesystems.media_disk', 'uploads');
    }

    public function disk(): Filesystem
    {
        return Storage::disk($this->diskName());
    }

    public function usesRemoteDisk(): bool
    {
        return $this->diskName() === 's3';
    }

    public function toStorageKey(string $path): string
    {
        return ltrim($path, '/');
    }

    public function toPublicPath(string $storageKey): string
    {
        return '/'.ltrim($storageKey, '/');
    }

    public function isManagedPath(?string $path): bool
    {
        if (! filled($path)) {
            return false;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return false;
        }

        return str_starts_with($this->toStorageKey($path), 'uploads/');
    }

    public function exists(?string $path): bool
    {
        if (! filled($path)) {
            return false;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return true;
        }

        return $this->disk()->exists($this->toStorageKey($path));
    }

    public function url(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $key = $this->toStorageKey($path);

        if (! $this->disk()->exists($key)) {
            return null;
        }

        if (! $this->usesRemoteDisk()) {
            return $this->toPublicPath($key);
        }

        return $this->disk()->url($key);
    }

    public function delete(?string $path): void
    {
        if (! $this->isManagedPath($path)) {
            return;
        }

        $this->disk()->delete($this->toStorageKey((string) $path));
    }

    public function putUploadedFile(UploadedFile $file, string $storageDirectory, string $filename): string
    {
        $directory = trim($storageDirectory, '/');
        $this->disk()->putFileAs($directory, $file, $filename);

        return $this->toPublicPath("{$directory}/{$filename}");
    }

    public function putContents(string $storageDirectory, string $filename, string $contents): string
    {
        $directory = trim($storageDirectory, '/');
        $key = "{$directory}/{$filename}";
        $this->disk()->put($key, $contents);

        return $this->toPublicPath($key);
    }

    public function copy(string $fromPath, string $storageDirectory, string $filename): ?string
    {
        $fromKey = $this->toStorageKey($fromPath);

        if (! $this->disk()->exists($fromKey)) {
            return null;
        }

        $directory = trim($storageDirectory, '/');
        $toKey = "{$directory}/{$filename}";
        $this->disk()->copy($fromKey, $toKey);

        return $this->toPublicPath($toKey);
    }

    /**
     * Local filesystem path for GD image processing. Remote objects are downloaded to a temp file.
     */
    public function localPathForProcessing(?string $path): ?string
    {
        if (! filled($path) || ! $this->isManagedPath($path)) {
            return null;
        }

        $key = $this->toStorageKey($path);

        if (! $this->disk()->exists($key)) {
            return null;
        }

        if (! $this->usesRemoteDisk()) {
            $local = public_path($key);

            return is_file($local) ? $local : null;
        }

        $temp = tempnam(sys_get_temp_dir(), 'flotory-media-');

        if ($temp === false) {
            return null;
        }

        file_put_contents($temp, $this->disk()->get($key));

        return $temp;
    }

    public function releaseTempPath(?string $localPath, ?string $sourcePath): void
    {
        if (! filled($localPath) || ! filled($sourcePath) || ! $this->usesRemoteDisk()) {
            return;
        }

        if (is_file($localPath)) {
            @unlink($localPath);
        }
    }

    public function deletePrefix(string $prefix): int
    {
        $prefix = trim($prefix, '/');
        $deleted = 0;

        foreach ($this->disk()->allFiles($prefix) as $file) {
            $this->disk()->delete($file);
            $deleted++;
        }

        foreach ($this->disk()->allDirectories($prefix) as $directory) {
            $this->disk()->deleteDirectory($directory);
        }

        return $deleted;
    }
}
