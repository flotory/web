<?php

namespace App\Models;

use App\Enums\VenueStaffInvitationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueStaffInvitation extends Model
{
    protected $hidden = [
        'token',
    ];

    protected $fillable = [
        'venue_id',
        'email',
        'role',
        'token',
        'invited_by',
        'status',
        'expires_at',
        'accepted_at',
        'accepted_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => VenueStaffInvitationStatus::class,
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    public function isPending(): bool
    {
        return $this->status === VenueStaffInvitationStatus::Pending;
    }

    public function isUsable(): bool
    {
        return $this->isPending() && $this->expires_at->isFuture();
    }
}
