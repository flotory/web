<?php

namespace Tests\Unit;

use App\Models\Venue;
use App\Models\Brand;
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
        $venue = $this->createVenue(['status' => Brand::STATUS_DRAFT]);

        $this->assertFalse($this->service->isPublic($venue));
    }

    public function test_submit_for_review_requires_completed_checklist(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue(['status' => Brand::STATUS_DRAFT]);

        $this->expectException(ValidationException::class);

        $this->service->submitForReview($venue, $owner);
    }

    public function test_submit_moves_ready_venue_to_pending_review(): void
    {
        $owner = $this->createUser();
        $venue = $this->createListingReadyVenue();

        $updated = $this->service->submitForReview($venue, $owner)->load('brand');

        $this->assertSame(Brand::STATUS_PENDING_REVIEW, $updated->brand->status);
        $this->assertNotNull($updated->brand->submitted_at);
    }

    public function test_admin_approval_publishes_venue_for_customers(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_PENDING_REVIEW]);

        $published = $this->service->approve($venue, $admin)->load('brand');

        $this->assertSame(Brand::STATUS_PUBLISHED, $published->brand->status);
        $this->assertTrue($this->service->isPublic($published));
    }

    public function test_admin_approval_requires_completed_checklist(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue(['status' => Brand::STATUS_PENDING_REVIEW]);

        $this->expectException(ValidationException::class);

        $this->service->approve($venue, $admin);
    }

    public function test_admin_rejection_returns_venue_to_owner_with_note(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_PENDING_REVIEW]);

        $rejected = $this->service->reject($venue, $admin, 'Please add a clearer storefront photo.')->load('brand');

        $this->assertSame(Brand::STATUS_REJECTED, $rejected->brand->status);
        $this->assertSame('Please add a clearer storefront photo.', $rejected->brand->review_note);
        $this->assertFalse($this->service->isPublic($rejected));
    }

    public function test_assert_public_rejects_draft_venue(): void
    {
        $venue = $this->createVenue(['status' => Brand::STATUS_DRAFT]);

        $this->expectException(ValidationException::class);

        try {
            $this->service->assertPublic($venue);
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('venue', $exception->errors());
            throw $exception;
        }
    }

    public function test_soft_deleted_venue_is_not_public(): void
    {
        $venue = $this->createPublishedVenue();
        $venue->delete();

        $this->assertFalse($this->service->isPublic($venue->fresh()));
    }

    public function test_assert_slug_can_change_blocks_published_slug_edit(): void
    {
        $venue = $this->createPublishedVenue(['slug' => 'live-venue']);

        $this->expectException(ValidationException::class);

        try {
            $this->service->assertSlugCanChange($venue, 'new-slug');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('slug', $exception->errors());
            throw $exception;
        }
    }

    public function test_checklist_labels_setup_files_step_as_files(): void
    {
        $venue = $this->createVenue(['status' => Brand::STATUS_DRAFT]);

        $items = $this->service->checklistItems($venue);
        $setupFiles = collect($items)->firstWhere('key', 'setup_files');

        $this->assertNotNull($setupFiles);
        $this->assertSame('Files', $setupFiles['label']);
    }

    public function test_admin_unpublish_returns_venue_to_draft(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createPublishedVenue();

        $draft = $this->service->unpublish($venue, $admin, 'Seasonal closure.')->load('brand');

        $this->assertSame(Brand::STATUS_DRAFT, $draft->brand->status);
        $this->assertNull($draft->brand->published_at);
        $this->assertFalse($this->service->isPublic($draft));
    }
}
