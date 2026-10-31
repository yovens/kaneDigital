<?php

namespace App\Observers;

use App\Models\Transaction;

/**
 * Chak fwa yon tranzaksyon kreye, chanje, efase oswa retabli,
 * balans kliyan an rekalkile.
 */
class TransactionObserver
{
    public function saved(Transaction $transaction): void
    {
        $this->refreshBalance($transaction);
    }

    public function deleted(Transaction $transaction): void
    {
        $this->refreshBalance($transaction);
    }

    public function restored(Transaction $transaction): void
    {
        $this->refreshBalance($transaction);
    }

    private function refreshBalance(Transaction $transaction): void
    {
        $transaction->customer()->first()?->recalculateBalance();
    }
}
