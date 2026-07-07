<?php

namespace Tests\Feature;

use App\Models\Venue;
use App\Models\Brand;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueListingControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_owner_can_submit_listing_ready_draft_venue_for_review(): void
    {
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_DRAFT], $owner);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/listing/submit")
            ->assertOk()
            ->assertJsonPath('venue.status', Brand::STATUS_PENDING_REVIEW)
            ->assertJsonPath('listing.status', Brand::STATUS_PENDING_REVIEW)
            ->assertJsonPath('listing.can_submit', false)
            ->assertJsonPath('listing.ready_to_submit', true);

        $this->assertSame(Brand::STATUS_PENDING_REVIEW, $venue->fresh()->brand->status);
        $this->assertNotNull($venue->fresh()->brand->submitted_at);
    }

    public function test_owner_can_resubmit_rejected_venue_when_checklist_is_complete(): void
    {
        $owner = $this->createUser(['email' => 'rejected-owner@example.com']);
        $venue = $this->createListingReadyVenue([
            'status' => Brand::STATUS_REJECTED,
            'review_note' => 'Please upload a clearer cover photo.',
        ], $owner);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/listing/submit")
            ->assertOk()
            ->assertJsonPath('venue.status', Brand::STATUS_PENDING_REVIEW)
            ->assertJsonPath('listing.review_note', null);

        $this->assertNull($venue->fresh()->brand->review_note);
    }

    public function test_submit_rejects_incomplete_checklist(): void
    {
        $owner = $this->createUser(['email' => 'incomplete@example.com']);
        $venue = $this->createVenue(['status' => Brand::STATUS_DRAFT]);
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/listing/submit")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listing']);
    }

    public function test_submit_rejects_already_pending_review_venue(): void
    {
        $owner = $this->createUser(['email' => 'pending@example.com']);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_PENDING_REVIEW], $owner);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/listing/submit")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listing']);
    }

    public function test_submit_rejects_published_venue(): void
    {
        $owner = $this->createUser(['email' => 'published@example.com']);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_PUBLISHED], $owner);

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$venue->id}/listing/submit")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listing']);
    }

    public function test_non_owner_cannot_submit_listing(): void
    {
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $other = $this->createUser(['email' => 'other@example.com']);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_DRAFT], $owner);

        Sanctum::actingAs($other);

        $this->postJson("/api/venues/{$venue->id}/listing/submit")
            ->assertNotFound();
    }

    public function test_guest_cannot_submit_listing(): void
    {
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_DRAFT], $owner);

        $this->postJson("/api/venues/{$venue->id}/listing/submit")
            ->assertUnauthorized();
    }

    public function test_owner_can_read_listing_snapshot(): void
    {
        $owner = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createListingReadyVenue(['status' => Brand::STATUS_DRAFT], $owner);

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venue->id}/listing")
            ->assertOk()
            ->assertJsonPath('venue_id', $venue->id)
            ->assertJsonPath('listing.status', Brand::STATUS_DRAFT)
            ->assertJsonPath('listing.can_submit', true)
            ->assertJsonCount(4, 'listing.items')
            ->assertJsonPath('listing.items.2.key', 'setup_files')
            ->assertJsonPath('listing.items.2.label', 'Files');
    }
}
