<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;

/** Yon mèt biznis wè epi modifye sèlman kliyan pa l yo. */
class CustomerPolicy
{
    public function view(User $user, Customer $customer): bool
    {
        return $this->owns($user, $customer);
    }

    public function update(User $user, Customer $customer): bool
    {
        return $this->owns($user, $customer);
    }

    public function delete(User $user, Customer $customer): bool
    {
        return $this->owns($user, $customer);
    }

    private function owns(User $user, Customer $customer): bool
    {
        return $user->business !== null && $user->business->id === $customer->business_id;
    }
}
