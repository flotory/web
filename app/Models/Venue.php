<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Venue extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const LOCATION_STATUS_PENDING_REVIEW = 'pending_review';

    public const LOCATION_STATUS_PUBLISHED = 'published';

    public const LOCATION_STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'brand_id',
        'is_primary',
        'location_status',
        'location_submitted_at',
        'location_published_at',
        'location_review_note',
        'name',
        'slug',
        'address',
        'latitude',
        'longitude',
        'timezone',
        'google_place_id',
    ];

    protected $appends = [
        'archived',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'latitude' => 'float',
            'longitude' => 'float',
            'location_submitted_at' => 'datetime',
            'location_published_at' => 'datetime',
        ];
    }

    public function getArchivedAttribute(): bool
    {
        return $this->trashed();
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(BrandUser::class, 'brand_id', 'brand_id');
    }

    public function owners(): HasMany
    {
        return $this->memberships()->where('role', 'owner');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'brand_users', 'brand_id', 'user_id', 'brand_id')
            ->withPivot(['role'])
            ->withTimestamps();
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'brand_id', 'brand_id');
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(Reward::class, 'brand_id', 'brand_id');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class, 'brand_id', 'brand_id');
    }

    public function setupFiles(): HasMany
    {
        return $this->hasMany(VenueSetupFile::class, 'brand_id', 'brand_id');
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function nfcTags(): HasMany
    {
        return $this->hasMany(NfcTag::class);
    }

    public function stampEvents(): HasMany
    {
        return $this->hasMany(StampEvent::class);
    }

    public function campaignTimezone(): string
    {
        $timezone = $this->timezone;

        if (is_string($timezone) && $timezone !== '' && in_array($timezone, timezone_identifiers_list(), true)) {
            return $timezone;
        }

        return (string) config('app.timezone', 'UTC');
    }

    public function isBranch(): bool
    {
        return ! $this->is_primary;
    }

    public function isLocationPublished(): bool
    {
        if ($this->is_primary) {
            return true;
        }

        return $this->location_status === self::LOCATION_STATUS_PUBLISHED;
    }
}
