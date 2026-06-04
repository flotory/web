<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class LegacyCardQrTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_customer_cards_api_omits_qr_token(): void
    {
        config(['loyalty.universal_qr_enabled' => true]);

        $user = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->createCustomer($venue, $user, ['qr_token' => (string) \Illuminate\Support\Str::uuid(), 'stamps' => 2]);
        $this->ensureUserStampToken($user);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/customer/cards');

        $response->assertOk();
        $this->assertArrayNotHasKey('qr_token', $response->json('cards.0'));
    }

    public function test_new_customers_have_null_qr_token(): void
    {
        $user = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $user);

        $this->assertNull($customer->qr_token);
    }
}
