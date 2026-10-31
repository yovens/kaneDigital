<?php

namespace App\Models;

use App\Enums\Currency;
use App\Enums\TransactionSource;
use App\Enums\TransactionType;
use App\Observers\TransactionObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

#[ObservedBy([TransactionObserver::class])]
class Transaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'customer_id',
        'type',
        'amount',
        'currency',
        'note',
        'occurred_at',
        'source',
        'created_by',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'currency' => Currency::class,
            'source' => TransactionSource::class,
            'amount' => 'decimal:2',
            'occurred_at' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Transaction $transaction) {
            $transaction->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** +montan pou kredi, -montan pou peman. */
    public function signedAmount(): float
    {
        $amount = (float) $this->amount;

        return $this->type === TransactionType::Credit ? $amount : -$amount;
    }
}
