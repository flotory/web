<?php

namespace App\Services;

use App\Models\User;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VenueSetupFileService
{
    private const MAX_BYTES = 10 * 1024 * 1024;

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
        $directory = public_path('uploads/venue-setup/'.$venue->id);

        File::ensureDirectoryExists($directory);

        $originalName = $file->getClientOriginalName();
        $byteSize = $file->getSize() ?: 0;
        $file->move($directory, $filename);

        return VenueSetupFile::query()->create([
            'venue_id' => $venue->id,
            'uploaded_by_user_id' => $user->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => $originalName,
            'path' => '/uploads/venue-setup/'.$venue->id.'/'.$filename,
            'mime_type' => $mime,
            'byte_size' => $byteSize,
        ]);
    }

    public function delete(VenueSetupFile $setupFile): void
    {
        if (str_starts_with($setupFile->path, '/uploads/venue-setup/')) {
            $absolute = public_path(ltrim($setupFile->path, '/'));
            if (File::exists($absolute)) {
                File::delete($absolute);
            }
        }

        $setupFile->delete();
    }

    public function hasAnyFiles(Venue $venue): bool
    {
        return $venue->setupFiles()->exists();
    }

    public function fileCount(Venue $venue): int
    {
        return $venue->setupFiles()->count();
    }

    /**
     * @return array<string, mixed>
     */
    public function present(VenueSetupFile $file): array
    {
        return [
            'id' => $file->id,
            'venue_id' => $file->venue_id,
            'kind' => $file->kind,
            'original_name' => $file->original_name,
            'path' => $file->path,
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
