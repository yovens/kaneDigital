<?php

namespace App\Support;

use App\Enums\Currency;
use App\Models\Customer;

final class ReminderMessage
{
    public static function for(Customer $customer): string
    {
        $amounts = [];

        if ((float) $customer->balance_htg > 0) {
            $amounts[] = Currency::HTG->format($customer->balance_htg);
        }

        if ((float) $customer->balance_usd > 0) {
            $amounts[] = Currency::USD->format($customer->balance_usd);
        }

        return sprintf(
            "Bonjou %s, se %s ki ap ekri w. Ti rapèl: ou dwe %s.\nOu ka wè tout detay yo la: %s\nMèsi anpil!",
            $customer->name,
            $customer->business->name,
            implode(' ak ', $amounts),
            $customer->publicUrl(),
        );
    }

    public static function whatsappUrl(string $phone, string $message): string
    {
        return 'https://wa.me/'.$phone.'?text='.rawurlencode($message);
    }

    public static function smsUrl(string $phone, string $message): string
    {
        return 'sms:+'.$phone.'?body='.rawurlencode($message);
    }
}
