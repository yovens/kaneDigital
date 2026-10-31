<?php

namespace App\Support;

/**
 * Nòmalize nimewo telefòn yo an fòma entènasyonal san "+":
 *   "3700-1234"        -> "50937001234"
 *   "+509 37 00 12 34" -> "50937001234"
 *   "00509 3700 1234"  -> "50937001234"
 * Se fòma sa a wa.me ak SMS bezwen.
 */
final class HaitiPhone
{
    public static function normalize(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        // Nimewo lokal ayisyen: 8 chif.
        if (strlen($digits) === 8) {
            return '509'.$digits;
        }

        return $digits;
    }

    public static function isValid(?string $phone): bool
    {
        $digits = self::normalize($phone);

        if ($digits === null || preg_match('/^\d{10,15}$/', $digits) !== 1) {
            return false;
        }

        // Si se yon nimewo Ayiti, li dwe gen egzakteman 509 + 8 chif.
        if (str_starts_with($digits, '509')) {
            return strlen($digits) === 11;
        }

        return true;
    }

    public static function display(?string $phone): ?string
    {
        $digits = self::normalize($phone);

        if ($digits !== null && str_starts_with($digits, '509') && strlen($digits) === 11) {
            return '+509 '.substr($digits, 3, 4).'-'.substr($digits, 7, 4);
        }

        return $digits === null ? null : '+'.$digits;
    }
}
