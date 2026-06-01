<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AdminActivityControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_admin_can_list_audit_activity(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $customer = $this->createCustomer($venue, $owner);

        AuditLog::loyalty('stamp.added', $customer, $owner, 'success', [
            'status' => 'success',
            'venue_id' => $venue->id,
            'customer_id' => $customer->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/activity?venue_id='.$venue->id)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.description', 'stamp.added')
            ->assertJsonPath('data.0.venue_id', $venue->id);
    }

    public function test_non_admin_cannot_list_audit_activity(): void
    {
        $owner = $this->createUser(['is_admin' => false]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/admin/activity')->assertForbidden();
    }

    public function test_api_responses_include_request_id_header(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $response->assertOk();
        $this->assertNotEmpty($response->headers->get('X-Request-Id'));
    }
}
