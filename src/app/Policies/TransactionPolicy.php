<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    public function update(User $user, Transaction $transaction): bool
    {
        return $this->owns($user, $transaction);
    }

    public function delete(User $user, Transaction $transaction): bool
    {
        return $this->owns($user, $transaction);
    }

    private function owns(User $user, Transaction $transaction): bool
    {
        return $user->business !== null && $user->business->id === $transaction->business_id;
    }
}
