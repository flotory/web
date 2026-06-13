<?php

namespace Tests\Feature;

use App\Models\NfcTag;
use App\Models\Venue;
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
        $brand = $this->createPublishedVenue([
            'name' => 'Mio Gelato',
            'slug' => 'mio-gelato',
        ]);
        $this->attachMember($brand, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->postJson("/api/venues/{$brand->id}/branches", [
            'name' => 'Mio Gelato · Vake',
            'address' => '14 Vake Park, Tbilisi',
            'latitude' => 41.7075,
            'longitude' => 44.7661,
            'google_place_id' => 'branch-vake',
        ])
            ->assertCreated()
            ->assertJsonPath('branch.name', 'Mio Gelato · Vake')
            ->assertJsonPath('branch.parent_venue_id', $brand->id);

        $this->getJson("/api/venues/{$brand->id}/branches")
            ->assertOk()
            ->assertJsonCount(1, 'branches')
            ->assertJsonPath('branches.0.name', 'Mio Gelato · Vake');
    }

    public function test_discover_lists_brands_only_with_branch_count(): void
    {
        $user = $this->createUser();
        $brand = $this->createPublishedVenue(['name' => 'Chain Cafe', 'slug' => 'chain-cafe']);

        Venue::query()->create([
            'parent_venue_id' => $brand->id,
            'name' => 'Chain Cafe · North',
            'slug' => 'chain-cafe-north',
            'category' => 'cafe',
            'status' => Venue::STATUS_PUBLISHED,
            'published_at' => now(),
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
        $brand = $this->createPublishedVenue(['name' => 'Mio Gelato', 'slug' => 'mio-gelato']);
        $branch = Venue::query()->create([
            'parent_venue_id' => $brand->id,
            'name' => 'Mio Gelato · Airport',
            'slug' => 'mio-gelato-airport',
            'category' => 'bakery',
            'status' => Venue::STATUS_PUBLISHED,
            'published_at' => now(),
            'address' => 'Airport Road 1, Tbilisi',
            'latitude' => 41.6692,
            'longitude' => 44.9547,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/venues/{$branch->slug}/join")
            ->assertCreated()
            ->assertJsonPath('customer.venue_id', $brand->id);

        $this->assertDatabaseHas('customers', [
            'venue_id' => $brand->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_nfc_stamp_at_brand_tag_uses_shared_wallet(): void
    {
        $user = $this->createUser();
        $brand = $this->createPublishedVenue(['name' => 'Mio Gelato', 'slug' => 'mio-gelato']);
        $this->createReward($brand);
        $tag = NfcTag::query()->create([
            'venue_id' => $brand->id,
            'token' => 'branch-shared-tag',
            'label' => 'Counter',
            'active' => true,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/nfc/t/{$tag->token}/stamp")
            ->assertCreated()
            ->assertJsonPath('customer.venue_id', $brand->id)
            ->assertJsonPath('joined_on_scan', true);
    }

    public function test_branch_landing_uses_brand_rewards_and_branch_address(): void
    {
        $brand = $this->createPublishedVenue([
            'name' => 'Mio Gelato',
            'slug' => 'mio-gelato',
            'logo' => '/uploads/mio-logo.png',
            'cover_image' => '/uploads/mio-cover.png',
        ]);
        $this->createReward($brand, [
            'title' => 'Free Scoop',
            'required_stamps' => 6,
        ]);
        $branch = Venue::query()->create([
            'parent_venue_id' => $brand->id,
            'name' => 'Mio Gelato · Rustaveli',
            'slug' => 'mio-gelato-rustaveli',
            'category' => 'bakery',
            'status' => Venue::STATUS_PUBLISHED,
            'published_at' => now(),
            'address' => '10 Rustaveli Ave, Tbilisi',
            'latitude' => 41.6977,
            'longitude' => 44.8015,
        ]);

        $this->getJson('/api/public/venues/mio-gelato-rustaveli/landing')
            ->assertOk()
            ->assertJsonPath('venue.name', 'Mio Gelato · Rustaveli')
            ->assertJsonPath('venue.address', '10 Rustaveli Ave, Tbilisi')
            ->assertJsonPath('venue.loyalty_venue_id', $brand->id)
            ->assertJsonPath('venue.logo', '/uploads/mio-logo.png')
            ->assertJsonPath('milestones.0.title', 'Free Scoop');
    }

    public function test_unpublished_brand_hides_branch_landing(): void
    {
        $brand = $this->createVenue(['name' => 'Draft Brand', 'slug' => 'draft-brand']);
        Venue::query()->create([
            'parent_venue_id' => $brand->id,
            'name' => 'Draft Brand · Branch',
            'slug' => 'draft-brand-branch',
            'category' => 'cafe',
            'status' => Venue::STATUS_DRAFT,
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
        $brand = $this->createPublishedVenue(['slug' => 'delete-branch-brand']);
        $this->attachMember($brand, $owner, 'owner');
        $branch = Venue::query()->create([
            'parent_venue_id' => $brand->id,
            'name' => 'Delete Me',
            'slug' => 'delete-me-branch',
            'category' => 'cafe',
            'status' => Venue::STATUS_PUBLISHED,
            'published_at' => now(),
            'address' => '9 Test Lane, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ]);

        Sanctum::actingAs($owner);

        $this->deleteJson("/api/venues/{$brand->id}/branches/{$branch->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('venues', ['id' => $branch->id]);
    }
}
