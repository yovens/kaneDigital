<?php

namespace App\Models;

use App\Enums\TransactionType;
use App\Support\HaitiPhone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'phone',
        'photo_path',
    ];

    protected function casts(): array
    {
        return [
            'balance_htg' => 'decimal:2',
            'balance_usd' => 'decimal:2',
            'last_activity_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Customer $customer) {
            $customer->uuid ??= (string) Str::uuid();
            $customer->public_token ??= Str::random(40);
        });
    }

    /** Wout API yo itilize uuid a, pa id entèn lan. */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => HaitiPhone::normalize($value),
        );
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }

    /** Kliyan ki dwe nan omwen yon lajan. */
    public function scopeOwing(Builder $query): void
    {
        $query->where(fn (Builder $q) => $q
            ->where('balance_htg', '>', 0)
            ->orWhere('balance_usd', '>', 0));
    }

    public function hasDebt(): bool
    {
        return (float) $this->balance_htg > 0 || (float) $this->balance_usd > 0;
    }

    public function publicUrl(): string
    {
        return route('kane.public', $this->public_token);
    }

    /**
     * Rekalkile balans yo apati tranzaksyon ki pa efase yo.
     * Balans = SUM(kredi) - SUM(peman), pou chak lajan.
     */
    public function recalculateBalance(): void
    {
        $totals = $this->transactions()
            ->toBase()
            ->selectRaw(
                'currency, SUM(CASE WHEN type = ? THEN amount ELSE -amount END) AS total',
                [TransactionType::Credit->value]
            )
            ->groupBy('currency')
            ->pluck('total', 'currency');

        $this->forceFill([
            'balance_htg' => round((float) ($totals['HTG'] ?? 0), 2),
            'balance_usd' => round((float) ($totals['USD'] ?? 0), 2),
            'last_activity_at' => $this->transactions()->max('occurred_at'),
        ])->saveQuietly();
    }
}
