<?php

namespace App\Http\Requests;

use App\Enums\Currency;
use App\Enums\TransactionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid' => ['nullable', 'uuid'],
            'type' => ['required', Rule::enum(TransactionType::class)],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999'],
            'currency' => ['nullable', Rule::enum(Currency::class)],
            'note' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Mete montan an.',
            'amount.gt' => 'Montan an dwe plis pase 0.',
        ];
    }
}
