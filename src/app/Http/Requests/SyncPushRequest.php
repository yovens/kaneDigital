<?php

namespace App\Http\Requests;

use App\Enums\Currency;
use App\Enums\TransactionType;
use App\Rules\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncPushRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customers' => ['sometimes', 'array', 'max:500'],
            'customers.*.uuid' => ['required', 'uuid'],
            'customers.*.name' => ['required', 'string', 'max:120'],
            'customers.*.phone' => ['nullable', 'string', new PhoneNumber],
            'customers.*.updated_at' => ['nullable', 'date'],
            'customers.*.deleted_at' => ['nullable', 'date'],

            'transactions' => ['sometimes', 'array', 'max:1000'],
            'transactions.*.uuid' => ['required', 'uuid'],
            'transactions.*.customer_uuid' => ['required', 'uuid'],
            'transactions.*.type' => ['required', Rule::enum(TransactionType::class)],
            'transactions.*.amount' => ['required', 'numeric', 'gt:0', 'max:999999999'],
            'transactions.*.currency' => ['nullable', Rule::enum(Currency::class)],
            'transactions.*.note' => ['nullable', 'string', 'max:255'],
            'transactions.*.occurred_at' => ['required', 'date'],
            'transactions.*.deleted_at' => ['nullable', 'date'],
        ];
    }
}
