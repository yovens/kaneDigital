<?php

namespace App\Rules;

use App\Support\HaitiPhone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! HaitiPhone::isValid($value)) {
            $fail('Nimewo telefòn nan pa bon. Egzanp: 3700-1234 oswa +509 3700-1234.');
        }
    }
}
