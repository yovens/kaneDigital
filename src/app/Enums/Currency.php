<?php

namespace App\Enums;

enum Currency: string
{
    case HTG = 'HTG';
    case USD = 'USD';

    public function format(float|int|string|null $amount): string
    {
        $value = (float) $amount;

        return match ($this) {
            self::HTG => number_format($value, 2, ',', ' ').' HTG',
            self::USD => 'US$ '.number_format($value, 2, '.', ','),
        };
    }
}
