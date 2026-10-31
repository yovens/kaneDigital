<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Transaction */
class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'customer_uuid' => $this->whenLoaded('customer', fn () => $this->customer?->uuid),
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'amount' => (float) $this->amount,
            'signed_amount' => $this->signedAmount(),
            'currency' => $this->currency->value,
            'amount_display' => $this->currency->format($this->amount),
            'note' => $this->note,
            'occurred_at' => $this->occurred_at,
            'source' => $this->source->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
