<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Reward extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
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

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function venue(): HasOne
    {
        return $this->hasOne(Venue::class, 'brand_id', 'brand_id')
            ->where('is_primary', true);
    }

    public function unlocks(): HasMany
    {
        return $this->hasMany(RewardUnlock::class);
    }
}
