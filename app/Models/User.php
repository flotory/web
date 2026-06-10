<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Mail\PasswordResetMail;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements CanResetPasswordContract
{
    use CanResetPassword;
    use HasApiTokens;
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'google_id',
        'google_avatar',
        'password',
        'is_admin',
        'active_venue_id',
        'birthday',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'birthday' => 'date',
        ];
    }

    public function activeVenue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'active_venue_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(VenueUser::class);
    }

    public function venues(): BelongsToMany
    {
        return $this->belongsToMany(Venue::class, 'venue_users')
            ->withPivot(['role'])
            ->withTimestamps();
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function stampToken(): HasOne
    {
        return $this->hasOne(UserStampToken::class);
    }

    public function createdVisits(): HasMany
    {
        return $this->hasMany(Visit::class, 'created_by');
    }

    public function stampEvents(): HasMany
    {
        return $this->hasMany(StampEvent::class);
    }

    public function isAdmin(): bool
    {
        return $this->is_admin;
    }

    public function sendPasswordResetNotification($token): void
    {
        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $url = $base.'/reset-password?'.http_build_query([
            'token' => $token,
            'email' => $this->email,
        ]);

        Mail::to($this)->send(new PasswordResetMail($url, $this));
    }
}
