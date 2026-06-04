<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserStampToken extends Model
{
    protected $fillable = [
        'user_id',
        'public_token',
        'version',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
