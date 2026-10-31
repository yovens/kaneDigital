<?php

namespace App\Console\Commands;

use App\Models\Customer;
use Illuminate\Console\Command;

class RecalculateBalances extends Command
{
    protected $signature = 'kane:recalculate {--business= : ID yon sèl biznis}';

    protected $description = 'Rekalkile balans tout kliyan yo apati tranzaksyon yo';

    public function handle(): int
    {
        $query = Customer::withTrashed()
            ->when($this->option('business'), fn ($q, $id) => $q->where('business_id', $id));

        $count = 0;

        $query->chunkById(200, function ($customers) use (&$count) {
            foreach ($customers as $customer) {
                $customer->recalculateBalance();
                $count++;
            }
        });

        $this->info("{$count} kliyan rekalkile.");

        return self::SUCCESS;
    }
}
