<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Venue extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'category',
        'logo',
        'logo_thumb',
        'cover_image',
        'cover_image_thumb',
        'address',
        'latitude',
        'longitude',
        'google_place_id',
        'phone',
        'website',
    ];

    protected $appends = [
        'archived',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function getArchivedAttribute(): bool
    {
        return $this->trashed();
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(VenueUser::class);
    }

    public function owners(): HasMany
    {
        return $this->memberships()->where('role', 'owner');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(Reward::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'venue_users')
            ->withPivot(['role'])
            ->withTimestamps();
    }
}
