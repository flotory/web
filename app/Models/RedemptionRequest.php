<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RedemptionRequest extends Model
{
    protected $fillable = [
        'reward_unlock_id',
        'token',
        'expires_at',
        'claimed_at',
        'claimed_by',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'claimed_at' => 'datetime',
        ];
    }

    public function rewardUnlock(): BelongsTo
    {
        return $this->belongsTo(RewardUnlock::class);
    }

    public function claimedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimed_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isClaimed(): bool
    {
        return $this->claimed_at !== null;
    }

    public function isActive(): bool
    {
        return ! $this->isClaimed() && ! $this->isExpired();
    }
}
