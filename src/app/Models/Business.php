<?php

namespace App\Models;

use App\Enums\Currency;
use App\Support\HaitiPhone;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'phone',
        'currency_default',
        'logo_path',
    ];

    protected function casts(): array
    {
        return [
            'currency_default' => Currency::class,
        ];
    }

    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => HaitiPhone::normalize($value),
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }

    /**
     * Plan gratis: limit kliyan apre esè a fini. Pro oswa esè: pa gen limit.
     */
    public function customerLimitReached(): bool
    {
        $owner = $this->user;

        if ($owner === null || $owner->isPro() || $owner->onTrial()) {
            return false;
        }

        return $this->customers()->count() >= config('kane.free_customer_limit');
    }
}
