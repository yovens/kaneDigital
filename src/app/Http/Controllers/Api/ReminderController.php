<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Support\ReminderMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ReminderController extends Controller
{
    /** GET /api/customers/{customer}/reminders */
    public function index(Customer $customer): JsonResponse
    {
        Gate::authorize('view', $customer);

        return response()->json([
            'data' => $customer->reminders()
                ->latest('sent_at')
                ->limit(50)
                ->get(['channel', 'message', 'amount_htg', 'amount_usd', 'sent_at']),
        ]);
    }

    /**
     * POST /api/customers/{customer}/reminders
     *
     * Prepare mesaj la epi bay lyen WhatsApp/SMS. Aplikasyon an louvri lyen an,
     * mèt boutik la jis peze "Voye". Sa pa koute anyen nan MVP a.
     */
    public function store(Request $request, Customer $customer): JsonResponse
    {
        Gate::authorize('update', $customer);

        $channel = $request->validate([
            'channel' => ['nullable', Rule::in(['whatsapp', 'sms'])],
        ])['channel'] ?? 'whatsapp';

        if (! $customer->phone) {
            return response()->json(['message' => 'Kliyan sa a pa gen nimewo telefòn.'], 422);
        }

        if (! $customer->hasDebt()) {
            return response()->json(['message' => 'Kliyan sa a pa dwe w anyen.'], 422);
        }

        $customer->loadMissing('business');
        $message = ReminderMessage::for($customer);

        $customer->reminders()->create([
            'business_id' => $customer->business_id,
            'channel' => $channel,
            'message' => $message,
            'amount_htg' => max(0, (float) $customer->balance_htg),
            'amount_usd' => max(0, (float) $customer->balance_usd),
            'sent_at' => now(),
        ]);

        return response()->json([
            'channel' => $channel,
            'message' => $message,
            'whatsapp_url' => ReminderMessage::whatsappUrl($customer->phone, $message),
            'sms_url' => ReminderMessage::smsUrl($customer->phone, $message),
        ], 201);
    }
}
