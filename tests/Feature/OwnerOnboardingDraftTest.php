<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\OwnerInvitation;
use App\Models\OwnerOnboardingDraft;
use App\Models\OwnerOnboardingDraftFile;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class OwnerOnboardingDraftTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_invited_owner_gets_draft_listing_without_creating_venue(): void
    {
        $user = $this->createUser(['email' => 'draft-owner@example.com']);

        OwnerInvitation::query()->create([
            'email' => 'draft-owner@example.com',
            'business_name' => 'Harbor Coffee',
            'token' => 'draft-token',
            'expires_at' => now()->addDay(),
            'accepted_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('active', true)
            ->assertJsonPath('uses_draft', true)
            ->assertJsonPath('venue', null)
            ->assertJsonPath('draft.name', 'Harbor Coffee')
            ->assertJsonPath('listing.status', 'draft')
            ->assertJsonPath('listing.can_submit', false);

        $this->assertDatabaseCount('venues', 0);
        $this->assertDatabaseCount('brands', 0);
    }

    public function test_owner_can_update_draft_without_creating_venue(): void
    {
        $user = $this->invitedOwner('update-draft@example.com');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'name' => 'Nareks Cafe 2',
                'category' => 'cafe',
            ])
            ->assertOk()
            ->assertJsonPath('draft.name', 'Nareks Cafe 2')
            ->assertJsonPath('listing.items.1.complete', true);

        $this->assertDatabaseCount('venues', 0);
        $this->assertDatabaseHas('owner_onboarding_drafts', [
            'user_id' => $user->id,
        ]);
    }

    public function test_submit_creates_venue_reward_and_submits_for_review(): void
    {
        $user = $this->invitedOwner('submit-draft@example.com');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'name' => 'Nareks Cafe 2',
                'category' => 'cafe',
                'address' => 'Cukrowa, Wrocław, Poland',
                'latitude' => 51.1079,
                'longitude' => 17.0385,
                'google_place_id' => 'test-place-id',
                'reward' => [
                    'title' => 'Free coffee',
                    'description' => 'A free coffee after 10 stamps.',
                    'required_stamps' => 10,
                ],
            ])
            ->assertOk();

        $file = UploadedFile::fake()->image('logo.png');
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/owner-onboarding/draft/files', ['file' => $file])
            ->assertCreated();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/owner-onboarding/submit')
            ->assertOk()
            ->assertJsonPath('venue.name', 'Nareks Cafe 2')
            ->assertJsonPath('listing.status', 'pending_review');

        $venueId = (int) $response->json('venue.id');

        $this->assertDatabaseCount('venues', 1);
        $this->assertDatabaseCount('brands', 1);
        $this->assertDatabaseMissing('owner_onboarding_drafts', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('owner_onboarding_draft_files', ['user_id' => $user->id]);
        $this->assertDatabaseHas('rewards', ['title' => 'Free coffee']);
        $this->assertGreaterThan(0, VenueSetupFile::query()->count());

        $venue = Venue::query()->findOrFail($venueId);
        $this->assertSame(Brand::STATUS_PENDING_REVIEW, $venue->brand?->status);
    }

    public function test_existing_owner_can_start_additional_venue_draft_with_address(): void
    {
        $user = $this->createUser(['email' => 'existing@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'Live Cafe', 'slug' => 'live-cafe']);
        $this->attachMember($venue, $user, 'owner');

        OwnerInvitation::query()->create([
            'email' => 'existing@example.com',
            'accepted_at' => now(),
            'token' => 'existing-owner',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'purpose' => 'additional_venue',
                'name' => 'Another',
                'category' => 'cafe',
                'address' => '2 Market Street, Torun',
                'latitude' => 53.0101,
                'longitude' => 18.6101,
                'google_place_id' => 'another-place',
            ])
            ->assertOk();
    }

    public function test_restarting_additional_venue_draft_clears_uploaded_files(): void
    {
        $user = $this->createUser(['email' => 'restart-draft@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'First Cafe', 'slug' => 'first-cafe']);
        $this->attachMember($venue, $user, 'owner');

        OwnerInvitation::query()->create([
            'email' => 'restart-draft@example.com',
            'accepted_at' => now(),
            'token' => 'restart-draft',
            'expires_at' => now()->addDay(),
        ]);

        $payload = [
            'purpose' => 'additional_venue',
            'name' => 'Nareks Cafe 3',
            'category' => 'cafe',
            'address' => 'Orla 2, Wrocław, Poland',
            'latitude' => 51.1079,
            'longitude' => 17.0385,
            'google_place_id' => 'nareks-cafe-3',
        ];

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [...$payload, 'restart' => true])
            ->assertOk();

        $file = UploadedFile::fake()->image('images.jpeg');
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/owner-onboarding/draft/files', ['file' => $file])
            ->assertCreated();

        $this->assertSame(1, OwnerOnboardingDraftFile::query()->where('user_id', $user->id)->count());

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                ...$payload,
                'restart' => true,
                'name' => 'Nareks Cafe 4',
            ])
            ->assertOk()
            ->assertJsonPath('draft.name', 'Nareks Cafe 4');

        $this->assertSame(0, OwnerOnboardingDraftFile::query()->where('user_id', $user->id)->count());
    }

    public function test_additional_venue_draft_requires_mapped_address(): void
    {
        $user = $this->createUser(['email' => 'additional-address@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'First Cafe', 'slug' => 'first-cafe']);
        $this->attachMember($venue, $user, 'owner');

        OwnerInvitation::query()->create([
            'email' => 'additional-address@example.com',
            'accepted_at' => now(),
            'token' => 'additional-address',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'purpose' => 'additional_venue',
                'restart' => true,
                'name' => 'Second Cafe',
                'category' => 'cafe',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['address', 'latitude', 'longitude']);
    }

    public function test_additional_venue_draft_does_not_create_venue_until_submit(): void
    {
        $user = $this->createUser(['email' => 'additional-draft@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'First Cafe', 'slug' => 'first-cafe']);
        $this->attachMember($venue, $user, 'owner');

        OwnerInvitation::query()->create([
            'email' => 'additional-draft@example.com',
            'accepted_at' => now(),
            'token' => 'additional-draft',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'purpose' => 'additional_venue',
                'restart' => true,
                'name' => 'Second Cafe',
                'category' => 'cafe',
                'address' => '2 Market Street, Torun',
                'latitude' => 53.0101,
                'longitude' => 18.6101,
                'google_place_id' => 'second-cafe-place',
            ])
            ->assertOk()
            ->assertJsonPath('draft.name', 'Second Cafe');

        $this->assertDatabaseCount('brands', 1);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding/additional-venue')
            ->assertOk()
            ->assertJsonPath('draft.name', 'Second Cafe');
    }

    public function test_abandoned_never_submitted_draft_brands_are_removed_from_index(): void
    {
        $user = $this->createUser(['email' => 'abandoned@example.com']);
        $live = $this->createPublishedVenue(['name' => 'Live Cafe', 'slug' => 'live-cafe']);
        $this->attachMember($live, $user, 'owner');

        $abandoned = $this->createVenue([
            'name' => 'Nareks Cafe 3',
            'slug' => 'nareks-cafe-3',
            'status' => Brand::STATUS_DRAFT,
        ]);
        $this->attachMember($abandoned, $user, 'owner');

        $this->assertDatabaseCount('brands', 2);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/venues')
            ->assertOk()
            ->assertJsonCount(1, 'venues')
            ->assertJsonPath('venues.0.name', 'Live Cafe');

        $this->assertSame(1, Brand::query()->count());
    }

    public function test_rejected_venue_owner_uses_venue_flow_not_draft(): void
    {
        $user = $this->createUser(['email' => 'rejected@example.com']);
        $venue = $this->createVenue([
            'name' => 'Rejected Cafe',
            'slug' => 'rejected-cafe',
            'status' => Brand::STATUS_REJECTED,
        ]);
        $this->attachMember($venue, $user, 'owner');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding')
            ->assertOk()
            ->assertJsonPath('uses_draft', false)
            ->assertJsonPath('venue.name', 'Rejected Cafe');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', ['name' => 'Nope'])
            ->assertForbidden();
    }

    public function test_additional_venue_submit_creates_second_brand_and_submits_for_review(): void
    {
        $user = $this->createUser(['email' => 'submit-additional@example.com']);
        $venue = $this->createPublishedVenue(['name' => 'First Cafe', 'slug' => 'first-cafe']);
        $this->attachMember($venue, $user, 'owner');

        OwnerInvitation::query()->create([
            'email' => 'submit-additional@example.com',
            'accepted_at' => now(),
            'token' => 'submit-additional',
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'purpose' => 'additional_venue',
                'restart' => true,
                'name' => 'Second Cafe',
                'category' => 'cafe',
                'address' => '2 Market Street, Torun',
                'latitude' => 53.0101,
                'longitude' => 18.6101,
                'google_place_id' => 'second-cafe-place',
                'reward' => [
                    'title' => 'Bonus coffee',
                    'description' => 'After 8 stamps',
                    'required_stamps' => 8,
                ],
            ])
            ->assertOk();

        $file = UploadedFile::fake()->image('logo.png');
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/owner-onboarding/draft/files', ['file' => $file])
            ->assertCreated();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/owner-onboarding/submit')
            ->assertOk()
            ->assertJsonPath('venue.name', 'Second Cafe')
            ->assertJsonPath('listing.status', 'pending_review');

        $this->assertDatabaseCount('brands', 2);
        $this->assertDatabaseMissing('owner_onboarding_drafts', ['user_id' => $user->id]);
    }

    public function test_destroy_draft_clears_draft_and_files(): void
    {
        $user = $this->invitedOwner('destroy-draft@example.com');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'name' => 'Temp Cafe',
                'category' => 'cafe',
            ])
            ->assertOk();

        $file = UploadedFile::fake()->image('logo.png');
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/owner-onboarding/draft/files', ['file' => $file])
            ->assertCreated();

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/owner-onboarding/draft')
            ->assertNoContent();

        $this->assertDatabaseMissing('owner_onboarding_drafts', ['user_id' => $user->id]);
        $this->assertSame(0, OwnerOnboardingDraftFile::query()->where('user_id', $user->id)->count());
    }

    public function test_additional_venue_endpoints_forbidden_without_live_brand(): void
    {
        $user = $this->createUser(['email' => 'draft-only@example.com']);
        $venue = $this->createVenue([
            'name' => 'Draft Only Cafe',
            'slug' => 'draft-only-cafe',
            'status' => Brand::STATUS_DRAFT,
        ]);
        $this->attachMember($venue, $user, 'owner');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'purpose' => 'additional_venue',
                'restart' => true,
                'name' => 'Nope',
                'category' => 'cafe',
                'address' => '1 Main St',
                'latitude' => 53.01,
                'longitude' => 18.61,
                'google_place_id' => 'nope',
            ])
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/owner-onboarding/additional-venue')
            ->assertForbidden();
    }

    public function test_submit_fails_when_listing_incomplete(): void
    {
        $user = $this->invitedOwner('incomplete-submit@example.com');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/owner-onboarding/draft', [
                'name' => 'Incomplete Cafe',
                'category' => 'cafe',
            ])
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/owner-onboarding/submit')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listing']);

        $this->assertDatabaseCount('venues', 0);
    }

    private function invitedOwner(string $email): User
    {
        $user = $this->createUser(['email' => $email]);

        OwnerInvitation::query()->create([
            'email' => $email,
            'business_name' => 'Harbor Coffee',
            'token' => 'token-'.Str::slug($email),
            'expires_at' => now()->addDay(),
            'accepted_at' => now(),
        ]);

        return $user;
    }
}
