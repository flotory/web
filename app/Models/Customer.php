<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'venue_id',
        'user_id',
        'stamps',
    ];

    protected function casts(): array
    {
        return [
            'stamps' => 'integer',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
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
