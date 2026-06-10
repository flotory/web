<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class NfcTag extends Model
{
    use HasFactory;

    protected $fillable = [
        'venue_id',
        'token',
        'label',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (NfcTag $tag): void {
            if (blank($tag->token)) {
                $tag->token = self::generateUniqueToken();
            }
        });
    }

    public static function generateUniqueToken(): string
    {
        do {
            $token = Str::lower(Str::random(32));
        } while (self::query()->where('token', $token)->exists());

        return $token;
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function stampEvents(): HasMany
    {
        return $this->hasMany(StampEvent::class);
    }

    public function tapUrl(?string $origin = null): string
    {
        $base = rtrim($origin ?? config('app.url'), '/');

        return "{$base}/t/{$this->token}";
    }
}
