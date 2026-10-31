<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Done demo: konekte ak telefòn 3700-0000, PIN 1234.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::create([
            'name' => 'Manno Joseph',
            'phone' => '50937000000',
            'pin' => '1234',
            'plan' => 'free',
            'trial_ends_at' => now()->addDays(30),
        ]);

        $business = $user->business()->create([
            'name' => 'Boutik Manno',
            'address' => 'Ri Gabriel, Okap',
            'currency_default' => 'HTG',
        ]);

        $customers = [
            ['Jak Pierre', '3711-2233', [['credit', 1250, 20, 'Diri ak lwil'], ['payment', 500, 10, null]]],
            ['Mari Joseph', '4802-1122', [['credit', 3000, 25, 'Kès Prestige'], ['payment', 1000, 18, null]]],
            ['Ti Pòl', null, [['credit', 400, 2, 'Pen ak manba']]],
            ['Madan Louis', '3655-9988', [['credit', 2200, 6, null], ['payment', 2200, 1, 'Peye tout']]],
            ['Wilson Desir', '3122-4455', [['credit', 15, 3, '1 galon gaz (USD)']]],
            ['Roseline', '4433-1100', [['credit', 850, 30, 'Savon, sik']]],
        ];

        foreach ($customers as [$name, $phone, $transactions]) {
            $customer = $business->customers()->create(['name' => $name, 'phone' => $phone]);

            foreach ($transactions as [$type, $amount, $daysAgo, $note]) {
                $business->transactions()->create([
                    'customer_id' => $customer->id,
                    'type' => $type,
                    'amount' => $amount,
                    'currency' => str_contains((string) $note, 'USD') ? 'USD' : 'HTG',
                    'note' => $note,
                    'occurred_at' => now()->subDays($daysAgo),
                    'source' => 'manual',
                    'created_by' => $user->id,
                ]);
            }
        }
    }
}
