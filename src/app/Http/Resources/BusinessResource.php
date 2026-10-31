<?php

namespace App\Http\Resources;

use App\Support\HaitiPhone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Business */
class BusinessResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'phone' => $this->phone,
            'phone_display' => HaitiPhone::display($this->phone),
            'currency_default' => $this->currency_default?->value,
        ];
    }
}
