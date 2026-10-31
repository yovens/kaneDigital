<?php

namespace App\Enums;

enum TransactionType: string
{
    /** Kliyan an pran machandiz sou kredi: dèt li monte. */
    case Credit = 'credit';

    /** Kliyan an peye: dèt li desann. */
    case Payment = 'payment';

    public function label(): string
    {
        return match ($this) {
            self::Credit => 'Kredi',
            self::Payment => 'Peman',
        };
    }
}
