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

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PENDING_REVIEW = 'pending_review';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'parent_venue_id',
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
        'timezone',
        'google_place_id',
        'phone',
        'website',
        'average_check_amount',
        'status',
        'review_note',
        'submitted_at',
        'published_at',
    ];

    protected $appends = [
        'archived',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'average_check_amount' => 'decimal:2',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    public function campaignTimezone(): string
    {
        $timezone = $this->timezone;

        if (is_string($timezone) && $timezone !== '' && in_array($timezone, timezone_identifiers_list(), true)) {
            return $timezone;
        }

        return (string) config('app.timezone', 'UTC');
    }

    public function getArchivedAttribute(): bool
    {
        return $this->trashed();
    }

    public function parentVenue(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_venue_id');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(self::class, 'parent_venue_id');
    }

    public function isBranch(): bool
    {
        return $this->parent_venue_id !== null;
    }

    public function isBrand(): bool
    {
        return $this->parent_venue_id === null;
    }

    /**
     * Brand that owns loyalty (rewards, NFC, wallet). Branches resolve to parent.
     */
    public function loyaltyVenue(): self
    {
        if ($this->relationLoaded('parentVenue') && $this->parentVenue !== null) {
            return $this->parentVenue;
        }

        if ($this->parent_venue_id !== null) {
            return self::query()->find($this->parent_venue_id) ?? $this;
        }

        return $this;
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

    public function setupFiles(): HasMany
    {
        return $this->hasMany(VenueSetupFile::class);
    }

    public function nfcTags(): HasMany
    {
        return $this->hasMany(NfcTag::class);
    }

    public function stampEvents(): HasMany
    {
        return $this->hasMany(StampEvent::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'venue_users')
            ->withPivot(['role'])
            ->withTimestamps();
    }
}
