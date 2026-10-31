<?php

namespace App\Http\Requests;

use App\Support\HaitiPhone;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('phone'))) {
            $this->merge(['phone' => HaitiPhone::normalize($this->input('phone'))]);
        }
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string'],
            'pin' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ];
    }
}
