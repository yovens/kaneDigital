<?php

namespace Tests\Feature\Kane;

use App\Models\Business;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

trait CreatesOwner
{
    protected function owner(?User $user = null): User
    {
        $user ??= User::factory()->create();
        Business::factory()->for($user)->create();

        Sanctum::actingAs($user->fresh());

        return $user->fresh();
    }
}
