<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reward extends Model
{
    use HasFactory;

    protected $fillable = [
        'venue_id',
        'title',
        'description',
        'image',
        'image_thumb',
        'required_stamps',
        'sort_order',
        'reward_type',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'required_stamps' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(RewardRedemption::class);
    }

    public function unlocks(): HasMany
    {
        return $this->hasMany(RewardUnlock::class);
    }
}
