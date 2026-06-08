<?php

namespace Tests\Unit;

use App\Models\Venue;
use App\Services\VenuePublicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenuePublicationServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    private VenuePublicationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(VenuePublicationService::class);
    }

    public function test_new_venues_start_as_draft_and_are_not_public(): void
    {
        $venue = $this->createVenue(['status' => Venue::STATUS_DRAFT]);

        $this->assertFalse($this->service->isPublic($venue));
    }

    public function test_submit_for_review_requires_completed_checklist(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['status' => Venue::STATUS_DRAFT]);

        $this->expectException(ValidationException::class);

        $this->service->submitForReview($venue, $owner);
    }

    public function test_submit_moves_ready_venue_to_pending_review(): void
    {
        $owner = $this->createUser();
        $venue = $this->createListingReadyVenue();

        $updated = $this->service->submitForReview($venue, $owner);

        $this->assertSame(Venue::STATUS_PENDING_REVIEW, $updated->status);
        $this->assertNotNull($updated->submitted_at);
    }

    public function test_admin_approval_publishes_venue_for_customers(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createListingReadyVenue(['status' => Venue::STATUS_PENDING_REVIEW]);

        $published = $this->service->approve($venue, $admin);

        $this->assertSame(Venue::STATUS_PUBLISHED, $published->status);
        $this->assertTrue($this->service->isPublic($published));
    }

    public function test_admin_approval_requires_completed_checklist(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue(['status' => Venue::STATUS_PENDING_REVIEW]);

        $this->expectException(ValidationException::class);

        $this->service->approve($venue, $admin);
    }

    public function test_admin_rejection_returns_venue_to_owner_with_note(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createListingReadyVenue(['status' => Venue::STATUS_PENDING_REVIEW]);

        $rejected = $this->service->reject($venue, $admin, 'Please add a clearer storefront photo.');

        $this->assertSame(Venue::STATUS_REJECTED, $rejected->status);
        $this->assertSame('Please add a clearer storefront photo.', $rejected->review_note);
        $this->assertFalse($this->service->isPublic($rejected));
    }
}
