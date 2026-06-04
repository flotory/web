<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\UserStampToken;
use App\Support\LoyaltyQr;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class UniversalQrScanTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['loyalty.universal_qr_enabled' => true]);
    }

    public function test_stamp_scan_auto_joins_guest_at_venue(): void
    {
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue(['name' => 'Join Cafe']);
        $this->attachMember($venue, $staff, 'staff');
        $this->createReward($venue, ['required_stamps' => 5]);

        $stampToken = UserStampToken::query()->create([
            'user_id' => $guest->id,
            'public_token' => 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
            'version' => 1,
        ]);

        $this->assertNull(
            Customer::query()->where('venue_id', $venue->id)->where('user_id', $guest->id)->first(),
        );

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/stamps", [
            'qr_token' => LoyaltyQr::memberQrPayload($stampToken->public_token),
            'stamps' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('joined_on_scan', true)
            ->assertJsonPath('customer.user_id', $guest->id)
            ->assertJsonPath('customer.stamps', 1);

        $this->assertDatabaseHas('customers', [
            'venue_id' => $venue->id,
            'user_id' => $guest->id,
            'stamps' => 1,
        ]);
    }

    public function test_lookup_accepts_member_qr_payload(): void
    {
        $staff = $this->createUser();
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $staff, 'staff');
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 2]);
        $this->createReward($venue, ['required_stamps' => 5]);

        $stampToken = $this->ensureUserStampToken($guest);

        Sanctum::actingAs($staff);

        $this->postJson("/api/venues/{$venue->id}/scanner/lookup", [
            'qr_token' => LoyaltyQr::memberQrPayload($stampToken->public_token),
        ])
            ->assertOk()
            ->assertJsonPath('customer.id', $customer->id)
            ->assertJsonPath('joined_on_scan', false);
    }

    public function test_customer_can_fetch_stamp_qr(): void
    {
        $guest = $this->createUser(['email' => 'guest@example.com']);
        Sanctum::actingAs($guest);

        $response = $this->getJson('/api/customer/stamp-qr');

        $response
            ->assertOk()
            ->assertJsonStructure(['public_token', 'qr_value', 'version']);

        $this->assertStringStartsWith(
            LoyaltyQr::MEMBER_PREFIX,
            $response->json('qr_value'),
        );

        $this->assertDatabaseHas('user_stamp_tokens', [
            'user_id' => $guest->id,
            'public_token' => $response->json('public_token'),
        ]);
    }
}
