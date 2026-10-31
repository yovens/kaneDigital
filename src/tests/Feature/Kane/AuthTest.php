<?php

namespace Tests\Feature\Kane;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_business_and_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Manno Joseph',
            'phone' => '3700-1234',
            'pin' => '1234',
            'pin_confirmation' => '1234',
            'business_name' => 'Boutik Manno',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'phone', 'business' => ['name']]])
            ->assertJsonPath('user.phone', '50937001234')
            ->assertJsonPath('user.on_trial', true)
            ->assertJsonPath('user.business.name', 'Boutik Manno')
            ->assertJsonPath('user.business.currency_default', 'HTG');

        $this->assertDatabaseHas('businesses', ['name' => 'Boutik Manno']);
    }

    public function test_same_phone_in_another_format_is_rejected(): void
    {
        User::factory()->create(['phone' => '50937001234']);

        $this->postJson('/api/auth/register', [
            'name' => 'Lòt Moun',
            'phone' => '+509 37 00 12 34',
            'pin' => '5678',
            'pin_confirmation' => '5678',
            'business_name' => 'Depo',
        ])->assertUnprocessable()->assertJsonValidationErrors('phone');
    }

    public function test_pin_must_be_4_to_6_digits(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Manno',
            'phone' => '37001234',
            'pin' => '12ab',
            'pin_confirmation' => '12ab',
            'business_name' => 'Boutik',
        ])->assertUnprocessable()->assertJsonValidationErrors('pin');
    }

    public function test_login_with_correct_pin_returns_token(): void
    {
        User::factory()->create(['phone' => '50937001234', 'pin' => '4321']);

        $this->postJson('/api/auth/login', ['phone' => '3700 1234', 'pin' => '4321'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_with_wrong_pin_fails(): void
    {
        User::factory()->create(['phone' => '50937001234', 'pin' => '4321']);

        $this->postJson('/api/auth/login', ['phone' => '37001234', 'pin' => '0000'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone');
    }

    public function test_api_requires_token(): void
    {
        $this->get('/api/customers')->assertUnauthorized();
    }
}
