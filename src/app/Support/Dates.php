<?php

namespace App\Support;

use Illuminate\Support\Carbon;

final class Dates
{
    /**
     * Telefòn nan voye dat ISO 8601 (souvan an UTC, "...Z"). Laravel sere dat
     * yo nan fizo orè aplikasyon an san konvèti yo, kidonk nou konvèti yo
     * anvan nou sere yo oswa konpare yo nan baz done a.
     */
    public static function toLocal(?string $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value)->setTimezone(config('app.timezone'));
    }
}
