<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Venue;
use App\Models\NfcTag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueBranchTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_owner_can_create_and_list_branches(): void
    {
        $owner = $this->createUser();
        $primary = $this->createPublishedVenue([
            'name' => 'Mio Gelato',
            'slug' => 'mio-gelato',
        ]);
        $this->attachMember($primary, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$primary->id}/branches", [
            'name' => 'Mio Gelato · Vake',
            'address' => '14 Vake Park, Tbilisi',
            'latitude' => 41.7075,
            'longitude' => 44.7661,
            'google_place_id' => 'branch-vake',
        ])
            ->assertCreated()
            ->assertJsonPath('branch.name', 'Mio Gelato · Vake')
            ->assertJsonPath('branch.brand_id', $primary->brand_id)
            ->assertJsonPath('branch.is_primary', false)
            ->assertJsonPath('branch.status', 'pending_review');

        $this->getJson("/api/venues/{$primary->id}/branches")
            ->assertOk()
            ->assertJsonCount(1, 'branches')
            ->assertJsonPath('branches.0.name', 'Mio Gelato · Vake');
    }

    public function test_discover_lists_primary_venues_with_branch_count(): void
    {
        $user = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Chain Cafe', 'slug' => 'chain-cafe']);

        $this->createVenueForBrand($primary->brand, [
            'name' => 'Chain Cafe · North',
            'slug' => 'chain-cafe-north',
            'address' => '2 North Road, Torun',
            'latitude' => 53.0201,
            'longitude' => 18.6201,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/venues/discover')
            ->assertOk()
            ->assertJsonCount(1, 'venues')
            ->assertJsonPath('venues.0.name', 'Chain Cafe')
            ->assertJsonPath('venues.0.branches_count', 1)
            ->assertJsonCount(1, 'venues.0.branches');
    }

    public function test_join_via_branch_slug_enrolls_on_brand(): void
    {
        $user = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Mio Gelato', 'slug' => 'mio-gelato']);
        $branch = $this->createVenueForBrand($primary->brand, [
            'name' => 'Mio Gelato · Airport',
            'slug' => 'mio-gelato-airport',
            'address' => 'Airport Road 1, Tbilisi',
            'latitude' => 41.6692,
            'longitude' => 44.9547,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/venues/{$branch->slug}/join")
            ->assertCreated()
            ->assertJsonPath('customer.venue_id', $primary->id)
            ->assertJsonPath('customer.brand_id', $primary->brand_id);

        $this->assertDatabaseHas('customers', [
            'brand_id' => $primary->brand_id,
            'user_id' => $user->id,
        ]);
    }

    public function test_nfc_stamp_at_brand_tag_uses_shared_wallet(): void
    {
        $user = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Mio Gelato', 'slug' => 'mio-gelato']);
        $this->createReward($primary);
        $tag = NfcTag::query()->create([
            'venue_id' => $primary->id,
            'token' => 'branch-shared-tag',
            'label' => 'Counter',
            'active' => true,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertCreated()
            ->assertJsonPath('customer.venue_id', $primary->id)
            ->assertJsonPath('customer.brand_id', $primary->brand_id)
            ->assertJsonPath('joined_on_scan', true);
    }

    public function test_pending_branch_is_hidden_from_public_until_admin_approves(): void
    {
        $owner = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Approve Branch Cafe', 'slug' => 'approve-branch-cafe']);
        $this->attachMember($primary, $owner, 'owner');
        $admin = $this->createUser(['is_admin' => true, 'email' => 'branch-admin@example.com']);

        Sanctum::actingAs($owner);

        $branchId = $this->postJson("/api/venues/{$primary->id}/branches", [
            'name' => 'Approve Branch Cafe · North',
            'address' => '2 North Road, Torun',
            'latitude' => 53.0201,
            'longitude' => 18.6201,
            'google_place_id' => 'approve-branch-north',
        ])
            ->assertCreated()
            ->json('branch.id');

        $branch = Venue::query()->findOrFail($branchId);

        $this->getJson('/api/public/venues/'.$branch->slug.'/landing')
            ->assertNotFound();

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/manage-venues/{$branch->id}/approve-branch")
            ->assertOk()
            ->assertJsonPath('branch.status', 'published');

        $this->getJson('/api/public/venues/'.$branch->slug.'/landing')
            ->assertOk()
            ->assertJsonPath('venue.name', 'Approve Branch Cafe · North');
    }

    public function test_branch_landing_uses_brand_rewards_and_branch_address(): void
    {
        $primary = $this->createPublishedVenue([
            'name' => 'Mio Gelato',
            'slug' => 'mio-gelato',
            'logo' => '/uploads/mio-logo.png',
            'cover_image' => '/uploads/mio-cover.png',
        ]);
        $this->createReward($primary, [
            'title' => 'Free Scoop',
            'required_stamps' => 6,
        ]);
        $branch = $this->createVenueForBrand($primary->brand, [
            'name' => 'Mio Gelato · Rustaveli',
            'slug' => 'mio-gelato-rustaveli',
            'address' => '10 Rustaveli Ave, Tbilisi',
            'latitude' => 41.6977,
            'longitude' => 44.8015,
        ]);

        $this->getJson('/api/public/venues/mio-gelato-rustaveli/landing')
            ->assertOk()
            ->assertJsonPath('venue.name', 'Mio Gelato · Rustaveli')
            ->assertJsonPath('venue.address', '10 Rustaveli Ave, Tbilisi')
            ->assertJsonPath('venue.loyalty_brand_id', $primary->brand_id)
            ->assertJsonPath('venue.logo', '/uploads/mio-logo.png')
            ->assertJsonPath('milestones.0.title', 'Free Scoop');
    }

    public function test_unpublished_brand_hides_branch_landing(): void
    {
        $primary = $this->createVenue(['name' => 'Draft Brand', 'slug' => 'draft-brand']);
        $this->createVenueForBrand($primary->brand, [
            'name' => 'Draft Brand · Branch',
            'slug' => 'draft-brand-branch',
            'address' => '1 Side Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);

        $this->getJson('/api/public/venues/draft-brand-branch/landing')
            ->assertNotFound();
    }

    public function test_owner_can_delete_branch(): void
    {
        $owner = $this->createUser();
        $primary = $this->createPublishedVenue(['slug' => 'delete-branch-brand']);
        $this->attachMember($primary, $owner, 'owner');
        $branch = $this->createVenueForBrand($primary->brand, [
            'name' => 'Delete Me',
            'slug' => 'delete-me-branch',
            'address' => '9 Test Lane, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$primary->id}/branches/{$branch->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('venues', ['id' => $branch->id]);
    }

    public function test_owner_venue_index_lists_primary_and_branch_locations(): void
    {
        $owner = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Mio', 'slug' => 'mio']);
        $branch = $this->createVenueForBrand($primary->brand, [
            'name' => 'Mio · Kentron',
            'slug' => 'mio-kentron',
            'address' => '1 Kentron Ave, Yerevan',
            'latitude' => 40.1776,
            'longitude' => 44.5126,
        ]);
        $this->attachMember($primary, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson('/api/venues')
            ->assertOk()
            ->assertJsonCount(2, 'venues')
            ->assertJsonPath('venues.0.brand_id', $primary->brand_id)
            ->assertJsonPath('venues.1.brand_id', $primary->brand_id)
            ->assertJsonFragment(['id' => $primary->id, 'is_primary' => true])
            ->assertJsonFragment(['id' => $branch->id, 'name' => 'Mio · Kentron']);
    }

    public function test_owner_can_create_branch_when_anchored_from_branch_venue(): void
    {
        $owner = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Mio', 'slug' => 'mio-anchor']);
        $existingBranch = $this->createVenueForBrand($primary->brand, [
            'name' => 'Mio · First',
            'slug' => 'mio-first',
            'address' => '1 First St, Yerevan',
            'latitude' => 40.1776,
            'longitude' => 44.5126,
        ]);
        $this->attachMember($primary, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$existingBranch->id}/branches", [
            'name' => 'Mio · Second',
            'address' => '2 Second St, Yerevan',
            'latitude' => 40.1780,
            'longitude' => 44.5130,
            'google_place_id' => 'branch-second',
        ])
            ->assertCreated()
            ->assertJsonPath('branch.brand_id', $primary->brand_id)
            ->assertJsonPath('branch.name', 'Mio · Second');
    }

    public function test_nfc_stamp_at_branch_tag_uses_shared_wallet_and_records_branch_visit(): void
    {
        $user = $this->createUser();
        $primary = $this->createPublishedVenue(['name' => 'Mio', 'slug' => 'mio-nfc']);
        $this->createReward($primary);
        $branch = $this->createVenueForBrand($primary->brand, [
            'name' => 'Mio · Branch',
            'slug' => 'mio-branch-nfc',
            'address' => '3 Branch St, Yerevan',
            'latitude' => 40.1790,
            'longitude' => 44.5140,
        ]);
        $tag = NfcTag::query()->create([
            'venue_id' => $branch->id,
            'token' => 'branch-only-tag',
            'label' => 'Branch counter',
            'active' => true,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertCreated()
            ->assertJsonPath('customer.brand_id', $primary->brand_id)
            ->assertJsonPath('customer.venue_id', $primary->id)
            ->assertJsonPath('customer.stamps', 1);

        $this->assertDatabaseHas('visits', [
            'venue_id' => $branch->id,
        ]);

        $this->assertDatabaseHas('stamp_events', [
            'venue_id' => $branch->id,
            'nfc_tag_id' => $tag->id,
        ]);
    }
}
