<?php

namespace Tests\Feature\Kane;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPageAndReminderTest extends TestCase
{
    use RefreshDatabase, CreatesOwner;

    public function test_public_page_shows_balance(): void
    {
        $user = $this->owner();
        $customer = $user->business->customers()->create(['name' => 'Jak Pierre']);

        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'credit', 'amount' => 1250]);

        $this->get('/k/'.$customer->public_token)
            ->assertOk()
            ->assertSee('Jak Pierre')
            ->assertSee('1 250,00 HTG')
            ->assertSee($user->business->name);
    }

    public function test_pwa_is_served_under_app(): void
    {
        $this->get('/app')->assertRedirect('/app/');
        $this->get('/app/')->assertOk()->assertSee('Kanè Dijital');
        $this->get('/')->assertRedirect('/app/');
    }

    public function test_unknown_token_is_404(): void
    {
        $this->get('/k/'.str_repeat('a', 40))->assertNotFound();
    }

    public function test_reminder_returns_whatsapp_link(): void
    {
        $user = $this->owner();
        $customer = $user->business->customers()->create(['name' => 'Jak', 'phone' => '37112233']);
        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'credit', 'amount' => 500]);

        $response = $this->postJson("/api/customers/{$customer->uuid}/reminders")
            ->assertCreated();

        $this->assertStringStartsWith('https://wa.me/50937112233?text=', $response->json('whatsapp_url'));
        $this->assertStringContainsString('500,00 HTG', $response->json('message'));
        $this->assertDatabaseCount('reminders', 1);
    }

    public function test_no_reminder_when_customer_owes_nothing(): void
    {
        $user = $this->owner();
        $customer = $user->business->customers()->create(['name' => 'Jak', 'phone' => '37112233']);

        $this->postJson("/api/customers/{$customer->uuid}/reminders")->assertUnprocessable();
    }

    public function test_no_reminder_without_phone(): void
    {
        $user = $this->owner();
        $customer = $user->business->customers()->create(['name' => 'Jak']);
        $this->postJson("/api/customers/{$customer->uuid}/transactions", ['type' => 'credit', 'amount' => 500]);

        $this->postJson("/api/customers/{$customer->uuid}/reminders")->assertUnprocessable();
    }
}
