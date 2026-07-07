<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class BrandUser extends Model
{
    use HasFactory;

    protected $table = 'brand_users';

    protected $fillable = [
        'brand_id',
        'user_id',
        'role',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function venue(): HasOne
    {
        return $this->hasOne(Venue::class, 'brand_id', 'brand_id')
            ->where('is_primary', true);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
