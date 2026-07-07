<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PENDING_REVIEW = 'pending_review';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'name',
        'slug',
        'category',
        'logo',
        'logo_thumb',
        'cover_image',
        'cover_image_thumb',
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
            'average_check_amount' => 'decimal:2',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    public function getArchivedAttribute(): bool
    {
        return $this->trashed();
    }

    public function venues(): HasMany
    {
        return $this->hasMany(Venue::class);
    }

    public function primaryVenue(): HasMany
    {
        return $this->venues()->where('is_primary', true);
    }

    public function branchVenues(): HasMany
    {
        return $this->venues()->where('is_primary', false);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(BrandUser::class);
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

    public function setupFiles(): HasMany
    {
        return $this->hasMany(VenueSetupFile::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'brand_users')
            ->withPivot(['role'])
            ->withTimestamps();
    }

    public function campaignTimezone(): string
    {
        $primary = $this->venues()->where('is_primary', true)->first()
            ?? $this->venues()->first();

        return $primary?->campaignTimezone() ?? (string) config('app.timezone', 'UTC');
    }
}
