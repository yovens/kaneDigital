<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '509'.fake()->unique()->numerify('3#######'),
            'pin' => '1234',
            'plan' => 'free',
            'trial_ends_at' => now()->addDays(30),
        ];
    }

    public function trialExpired(): static
    {
        return $this->state(fn () => ['trial_ends_at' => now()->subDay()]);
    }

    public function pro(): static
    {
        return $this->state(fn () => ['plan' => 'pro']);
    }
}
