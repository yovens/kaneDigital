<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Contracts\View\View;

/** Paj piblik /k/{token}: kliyan an wè sa l dwe san li pa bezwen kont. */
class PublicKaneController extends Controller
{
    public function show(string $token): View
    {
        $customer = Customer::where('public_token', $token)
            ->with('business')
            ->firstOrFail();

        $transactions = $customer->transactions()
            ->latest('occurred_at')
            ->latest('id')
            ->limit(50)
            ->get();

        return view('kane.show', [
            'customer' => $customer,
            'business' => $customer->business,
            'transactions' => $transactions,
        ]);
    }
}
