<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerRewardCycle extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'cycle_number',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'cycle_number' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
