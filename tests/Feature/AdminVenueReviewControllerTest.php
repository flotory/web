<?php

namespace Tests\Feature;

use App\Models\Venue;
use App\Services\VenuePublicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AdminVenueReviewControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_admin_can_list_pending_venues_with_pagination_meta(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $this->createListingReadyVenue(['status' => Venue::STATUS_PENDING_REVIEW, 'name' => 'Pending One']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/venues?status=pending_review')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('venues.0.status', Venue::STATUS_PENDING_REVIEW);
    }

    public function test_admin_review_queue_includes_setup_file_metadata(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $this->createListingReadyVenue(['status' => Venue::STATUS_PENDING_REVIEW]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/venues?status=pending_review')
            ->assertOk()
            ->assertJsonPath('venues.0.setup_files_count', 1)
            ->assertJsonPath('venues.0.final_logo_applied', true);
    }

    public function test_non_admin_cannot_access_venue_review_queue(): void
    {
        $owner = $this->createUser();
        Sanctum::actingAs($owner);

        $this->getJson('/api/admin/venues')->assertForbidden();
    }

    public function test_admin_can_approve_pending_venue(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createListingReadyVenue(['status' => Venue::STATUS_PENDING_REVIEW]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/venues/{$venue->id}/approve")
            ->assertOk()
            ->assertJsonPath('venue.status', Venue::STATUS_PUBLISHED);
    }

    public function test_admin_cannot_approve_incomplete_pending_venue(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue([
            'status' => Venue::STATUS_PENDING_REVIEW,
            'category' => 'cafe',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/venues/{$venue->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listing']);
    }

    public function test_admin_can_unpublish_with_note(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createListingReadyVenue(['status' => Venue::STATUS_PUBLISHED]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/venues/{$venue->id}/unpublish", [
            'note' => 'Please refresh your menu photos.',
        ])
            ->assertOk()
            ->assertJsonPath('venue.status', Venue::STATUS_DRAFT)
            ->assertJsonPath('venue.review_note', 'Please refresh your menu photos.');
    }

    public function test_approve_rejects_incomplete_checklist_at_service_level(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue(['status' => Venue::STATUS_PENDING_REVIEW]);
        $service = app(VenuePublicationService::class);

        $this->expectException(ValidationException::class);

        $service->approve($venue, $admin);
    }
}
