<?php

namespace App\Http\Resources;

use App\Support\HaitiPhone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'phone_display' => HaitiPhone::display($this->phone),
            'plan' => $this->plan,
            'on_trial' => $this->onTrial(),
            'trial_ends_at' => $this->trial_ends_at,
            'business' => new BusinessResource($this->whenLoaded('business')),
        ];
    }
}
