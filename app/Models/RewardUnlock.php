<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RewardUnlock extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'reward_id',
        'cycle_number',
        'unlocked_at',
        'claimed_at',
        'claimed_by',
    ];

    protected function casts(): array
    {
        return [
            'cycle_number' => 'integer',
            'unlocked_at' => 'datetime',
            'claimed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(Reward::class);
    }

    public function claimedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimed_by');
    }
}
