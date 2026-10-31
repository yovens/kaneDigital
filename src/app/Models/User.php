<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'phone',
        'pin',
        'plan',
        'trial_ends_at',
    ];

    protected $hidden = [
        'pin',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'pin' => 'hashed',
            'trial_ends_at' => 'datetime',
        ];
    }

    /** PIN nan jwe wòl modpas la. */
    public function getAuthPasswordName(): string
    {
        return 'pin';
    }

    public function getAuthPassword(): string
    {
        return (string) $this->pin;
    }

    /** Nan MVP a, chak itilizatè gen yon sèl biznis. */
    public function business(): HasOne
    {
        return $this->hasOne(Business::class);
    }

    public function onTrial(): bool
    {
        return $this->trial_ends_at?->isFuture() ?? false;
    }

    public function isPro(): bool
    {
        return $this->plan === 'pro';
    }
}
