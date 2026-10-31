<?php

namespace App\Http\Requests;

use App\Rules\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Opsyonèl: telefòn nan ka voye uuid li te kreye offline.
            'uuid' => ['nullable', 'uuid'],
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', new PhoneNumber],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Mete non kliyan an.',
        ];
    }
}
