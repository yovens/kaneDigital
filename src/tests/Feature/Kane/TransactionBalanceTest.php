<?php

namespace Tests\Feature\Kane;

use App\Models\Customer;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TransactionBalanceTest extends TestCase
{
    use RefreshDatabase, CreatesOwner;

    private function customer(): Customer
    {
        $user = $this->owner();

        return $user->business->customers()->create(['name' => 'Jak']);
    }

    public function test_credit_and_payment_update_balance(): void
    {
        $customer = $this->customer();

        $this->postJson("/api/customers/{$customer->uuid}/transactions", [
            'type' => 'credit', 'amount' => 1250, 'note' => 'Diri',
        ])->assertCreated()->assertJsonPath('customer.balance.HTG', 1250);

        $this->postJson("/api/customers/{$customer->uuid}/transactions", [
            'type' => 'payment', 'amount' => 500,
        ])->assertCreated()
            ->assertJsonPath('customer.balance.HTG', 750)
            ->assertJsonPath('customer.has_debt', true);
    }

    public function test_currencies_are_kept_separate(): void
    {
        $customer = $this->customer();

        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'credit', 'amount' => 1000]);
        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'credit', 'amount' => 20, 'currency' => 'USD'])
            ->assertJsonPath('customer.balance.HTG', 1000)
            ->assertJsonPath('customer.balance.USD', 20);
    }

    public function test_deleting_a_transaction_restores_balance(): void
    {
        $customer = $this->customer();

        $uuid = $this->postJson("/api/customers/{$customer->uuid}/transactions", [
            'type' => 'credit', 'amount' => 800,
        ])->json('data.uuid');

        $this->deleteJson("/api/transactions/{$uuid}")
            ->assertOk()
            ->assertJsonPath('customer.balance.HTG', 0);

        $this->assertSoftDeleted('transactions', ['uuid' => $uuid]);
    }

    public function test_editing_amount_recalculates_balance(): void
    {
        $customer = $this->customer();

        $uuid = $this->postJson("/api/customers/{$customer->uuid}/transactions", [
            'type' => 'credit', 'amount' => 800,
        ])->json('data.uuid');

        $this->patchJson("/api/transactions/{$uuid}", ['amount' => 600])
            ->assertOk()
            ->assertJsonPath('customer.balance.HTG', 600);
    }

    public function test_same_uuid_never_creates_two_transactions(): void
    {
        $customer = $this->customer();
        $payload = ['uuid' => (string) Str::uuid(), 'type' => 'credit', 'amount' => 300];

        $this->postJson("/api/customers/{$customer->uuid}/transactions", $payload)->assertCreated();
        $this->postJson("/api/customers/{$customer->uuid}/transactions", $payload)
            ->assertOk()
            ->assertJsonPath('customer.balance.HTG', 300);

        $this->assertSame(1, Transaction::count());
    }

    public function test_amount_must_be_positive(): void
    {
        $customer = $this->customer();

        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'credit', 'amount' => 0])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('amount');
    }

    public function test_cannot_add_transaction_to_another_business_customer(): void
    {
        $other = Customer::factory()->create();
        $this->owner();

        $this->postJson("/api/customers/{$other->uuid}/transactions", ['type' => 'credit', 'amount' => 100])
            ->assertForbidden();
    }

    public function test_dashboard_totals(): void
    {
        $customer = $this->customer();

        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'credit', 'amount' => 2000]);
        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'payment', 'amount' => 500]);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('total_owed.HTG', 1500)
            ->assertJsonPath('debtors_count', 1)
            ->assertJsonPath('today.credits.HTG', 2000)
            ->assertJsonPath('today.payments.HTG', 500)
            ->assertJsonPath('top_debtors.0.name', 'Jak');
    }

    public function test_dashboard_lists_overdue_customers(): void
    {
        $customer = $this->customer();

        $this->postJson("/api/customers/{$customer->uuid}/transactions", [
            'type' => 'credit', 'amount' => 900, 'occurred_at' => now()->subDays(30)->toJSON(),
        ]);

        $this->getJson('/api/dashboard')
            ->assertJsonCount(1, 'overdue')
            ->assertJsonPath('overdue.0.uuid', $customer->uuid);
    }
}
