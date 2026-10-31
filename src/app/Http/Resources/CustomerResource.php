<?php

namespace App\Http\Resources;

use App\Enums\Currency;
use App\Support\HaitiPhone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Customer */
class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'phone' => $this->phone,
            'phone_display' => HaitiPhone::display($this->phone),
            'balance' => [
                'HTG' => (float) $this->balance_htg,
                'USD' => (float) $this->balance_usd,
            ],
            'balance_display' => [
                'HTG' => Currency::HTG->format($this->balance_htg),
                'USD' => Currency::USD->format($this->balance_usd),
            ],
            'has_debt' => $this->hasDebt(),
            'last_activity_at' => $this->last_activity_at,
            'last_payment_at' => $this->when(
                array_key_exists('last_payment_at', $this->resource->getAttributes()),
                fn () => $this->resource->getAttribute('last_payment_at'),
            ),
            'public_url' => $this->publicUrl(),
            'recent_transactions' => TransactionResource::collection($this->whenLoaded('transactions')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
