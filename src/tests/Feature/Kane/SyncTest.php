<?php

namespace Tests\Feature\Kane;

use App\Models\Customer;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SyncTest extends TestCase
{
    use RefreshDatabase, CreatesOwner;

    private function offlinePayload(): array
    {
        $customerUuid = (string) Str::uuid();

        return [
            'customers' => [
                ['uuid' => $customerUuid, 'name' => 'Ti Pòl', 'phone' => '37001111', 'updated_at' => now()->toJSON()],
            ],
            'transactions' => [
                ['uuid' => (string) Str::uuid(), 'customer_uuid' => $customerUuid, 'type' => 'credit', 'amount' => 400, 'occurred_at' => now()->subHour()->toJSON()],
                ['uuid' => (string) Str::uuid(), 'customer_uuid' => $customerUuid, 'type' => 'payment', 'amount' => 150, 'occurred_at' => now()->toJSON()],
            ],
        ];
    }

    public function test_push_creates_customers_and_transactions(): void
    {
        $this->owner();
        $payload = $this->offlinePayload();

        $this->postJson('/api/sync/push', $payload)
            ->assertOk()
            ->assertJsonCount(1, 'accepted.customers')
            ->assertJsonCount(2, 'accepted.transactions')
            ->assertJsonCount(0, 'rejected');

        $customer = Customer::where('uuid', $payload['customers'][0]['uuid'])->first();
        $this->assertEquals(250, (float) $customer->balance_htg);
    }

    public function test_pushing_twice_does_not_duplicate(): void
    {
        $this->owner();
        $payload = $this->offlinePayload();

        $this->postJson('/api/sync/push', $payload)->assertOk();
        $this->postJson('/api/sync/push', $payload)->assertOk();

        $this->assertSame(1, Customer::count());
        $this->assertSame(2, Transaction::count());
    }

    public function test_push_can_delete_a_transaction(): void
    {
        $this->owner();
        $payload = $this->offlinePayload();
        $this->postJson('/api/sync/push', $payload);

        $payload['transactions'][1]['deleted_at'] = now()->toJSON();
        $this->postJson('/api/sync/push', ['transactions' => [$payload['transactions'][1]]])->assertOk();

        $customer = Customer::where('uuid', $payload['customers'][0]['uuid'])->first();
        $this->assertEquals(400, (float) $customer->balance_htg);
    }

    public function test_unknown_customer_is_rejected(): void
    {
        $this->owner();

        $this->postJson('/api/sync/push', [
            'transactions' => [
                ['uuid' => (string) Str::uuid(), 'customer_uuid' => (string) Str::uuid(), 'type' => 'credit', 'amount' => 100, 'occurred_at' => now()->toJSON()],
            ],
        ])->assertOk()->assertJsonPath('rejected.0.reason', 'customer_not_found');
    }

    public function test_cannot_push_into_another_business_customer(): void
    {
        $other = Customer::factory()->create();
        $this->owner();

        $this->postJson('/api/sync/push', [
            'transactions' => [
                ['uuid' => (string) Str::uuid(), 'customer_uuid' => $other->uuid, 'type' => 'credit', 'amount' => 100, 'occurred_at' => now()->toJSON()],
            ],
        ])->assertOk()->assertJsonPath('rejected.0.reason', 'customer_not_found');

        $this->assertSame(0, Transaction::count());
    }

    public function test_pull_returns_changes_since_timestamp(): void
    {
        $user = $this->owner();
        $user->business->customers()->create(['name' => 'Ansyen']);

        // Pull la itilize ">=" (pou pa janm rate anyen nan menm segonn nan),
        // kidonk nou kite tan pase anvan premye pull la.
        $this->travel(5)->seconds();

        $since = $this->getJson('/api/sync/pull')
            ->assertOk()
            ->assertJsonCount(1, 'customers')
            ->assertJsonPath('has_more', false)
            ->json('next_since');

        $this->travel(5)->seconds();
        $user->business->customers()->create(['name' => 'Nouvo']);

        $this->getJson('/api/sync/pull?since='.urlencode($since))
            ->assertOk()
            ->assertJsonCount(1, 'customers')
            ->assertJsonPath('customers.0.name', 'Nouvo');
    }
}
