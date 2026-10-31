<?php

namespace Tests\Feature\Kane;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CustomerTest extends TestCase
{
    use RefreshDatabase, CreatesOwner;

    public function test_owner_can_create_and_list_customers(): void
    {
        $this->owner();

        $this->postJson('/api/customers', ['name' => 'Jak Pierre', 'phone' => '3711-2233'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Jak Pierre')
            ->assertJsonPath('data.phone', '50937112233')
            ->assertJsonPath('data.balance.HTG', 0);

        $this->getJson('/api/customers')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_create_with_same_uuid_is_idempotent(): void
    {
        $this->owner();
        $uuid = (string) Str::uuid();

        $this->postJson('/api/customers', ['uuid' => $uuid, 'name' => 'Mari'])->assertCreated();
        $this->postJson('/api/customers', ['uuid' => $uuid, 'name' => 'Mari'])->assertOk();

        $this->assertSame(1, Customer::count());
    }

    public function test_search_by_name_and_phone(): void
    {
        $user = $this->owner();
        $user->business->customers()->create(['name' => 'Jak Pierre', 'phone' => '37112233']);
        $user->business->customers()->create(['name' => 'Mari Joseph', 'phone' => '48021122']);

        $this->getJson('/api/customers?search=jak')->assertJsonCount(1, 'data');
        $this->getJson('/api/customers?search=4802')->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Mari Joseph');
    }

    public function test_cannot_see_another_business_customer(): void
    {
        $other = Customer::factory()->create();

        $this->owner();

        $this->getJson("/api/customers/{$other->uuid}")->assertForbidden();
        $this->deleteJson("/api/customers/{$other->uuid}")->assertForbidden();
    }

    public function test_free_plan_limit_after_trial(): void
    {
        config(['kane.free_customer_limit' => 2]);
        $user = $this->owner(User::factory()->trialExpired()->create());

        Customer::factory()->count(2)->create(['business_id' => $user->business->id]);

        $this->postJson('/api/customers', ['name' => 'Twazyèm'])
            ->assertForbidden()
            ->assertJsonPath('code', 'customer_limit');
    }

    public function test_invalid_phone_is_rejected(): void
    {
        $this->owner();

        $this->postJson('/api/customers', ['name' => 'Jak', 'phone' => '12'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone');
    }
}
