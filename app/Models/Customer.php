<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'user_id',
        'stamps',
        'lifetime_stamps',
    ];

    protected $appends = [
        'venue_id',
    ];

    protected function casts(): array
    {
        return [
            'stamps' => 'integer',
            'lifetime_stamps' => 'integer',
        ];
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function venue(): HasOne
    {
        return $this->hasOne(Venue::class, 'brand_id', 'brand_id')
            ->where('is_primary', true);
    }

    public function getVenueIdAttribute(): ?int
    {
        if ($this->relationLoaded('venue') && $this->venue) {
            return $this->venue->id;
        }

        return Venue::query()
            ->where('brand_id', $this->brand_id)
            ->orderByDesc('is_primary')
            ->value('id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function stampEvents(): HasMany
    {
        return $this->hasMany(StampEvent::class);
    }

    public function rewardCycles(): HasMany
    {
        return $this->hasMany(CustomerRewardCycle::class);
    }

    public function rewardUnlocks(): HasMany
    {
        return $this->hasMany(RewardUnlock::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(CustomerNote::class)->latest();
    }
}
