<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reminder extends Model
{
    protected $fillable = [
        'business_id',
        'channel',
        'message',
        'amount_htg',
        'amount_usd',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_htg' => 'decimal:2',
            'amount_usd' => 'decimal:2',
            'sent_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
