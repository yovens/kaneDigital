<?php

namespace App\Http\Requests;

use App\Enums\Currency;
use App\Rules\PhoneNumber;
use App\Support\HaitiPhone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', new PhoneNumber, 'unique:users,phone'],
            'pin' => ['required', 'digits_between:4,6', 'confirmed'],
            'business_name' => ['required', 'string', 'max:120'],
            'currency_default' => ['nullable', Rule::enum(Currency::class)],
            'device_name' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.unique' => 'Gen yon kont ki deja itilize nimewo sa a.',
            'pin.digits_between' => 'PIN nan dwe gen 4 a 6 chif.',
            'pin.confirmed' => 'De PIN yo pa menm.',
        ];
    }
}
