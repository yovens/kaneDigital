<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Transaction>
 */
class TransactionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'business_id' => fn (array $attributes) => Customer::find($attributes['customer_id'])->business_id,
            'type' => 'credit',
            'amount' => fake()->randomElement([100, 250, 500, 750, 1000, 1500]),
            'currency' => 'HTG',
            'occurred_at' => now(),
            'source' => 'manual',
        ];
    }

    public function payment(): static
    {
        return $this->state(fn () => ['type' => 'payment']);
    }
}
