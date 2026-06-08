<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueSetupFile extends Model
{
    public const KIND_FILE = 'file';

    /** @deprecated Legacy uploads; new owner uploads use {@see KIND_FILE}. */
    public const KIND_LOGO = 'logo';

    /** @deprecated Legacy uploads; new owner uploads use {@see KIND_FILE}. */
    public const KIND_COVER = 'cover';

    /** @deprecated Legacy uploads; new owner uploads use {@see KIND_FILE}. */
    public const KIND_DOCUMENT = 'document';

    protected $fillable = [
        'venue_id',
        'uploaded_by_user_id',
        'kind',
        'original_name',
        'path',
        'mime_type',
        'byte_size',
    ];

    protected function casts(): array
    {
        return [
            'byte_size' => 'integer',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }
}
