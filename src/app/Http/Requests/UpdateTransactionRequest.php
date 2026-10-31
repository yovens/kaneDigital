<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => ['sometimes', 'numeric', 'gt:0', 'max:999999999'],
            'note' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['sometimes', 'date'],
        ];
    }
}
