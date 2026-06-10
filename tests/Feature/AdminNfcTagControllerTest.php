<?php

namespace Tests\Feature;

use App\Models\NfcTag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AdminNfcTagControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_admin_can_create_list_and_update_nfc_tags_for_a_venue(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createPublishedVenue(['name' => 'Stand Venue']);

        Sanctum::actingAs($admin);

        $create = $this->postJson("/api/admin/manage-venues/{$venue->id}/nfc-tags", [
            'label' => 'Counter stand',
        ]);

        $create
            ->assertCreated()
            ->assertJsonPath('tag.label', 'Counter stand')
            ->assertJsonPath('tag.active', true);

        $tagId = $create->json('tag.id');

        $this->getJson("/api/admin/manage-venues/{$venue->id}/nfc-tags")
            ->assertOk()
            ->assertJsonCount(1, 'tags')
            ->assertJsonPath('tags.0.id', $tagId);

        $this->patchJson("/api/admin/nfc-tags/{$tagId}", [
            'active' => false,
            'label' => 'Shipped stand',
        ])
            ->assertOk()
            ->assertJsonPath('tag.active', false)
            ->assertJsonPath('tag.label', 'Shipped stand');
    }

    public function test_non_admin_cannot_manage_nfc_tags(): void
    {
        $user = $this->createUser(['email' => 'owner@example.com']);
        $venue = $this->createPublishedVenue();
        $this->attachMember($venue, $user, 'owner');

        Sanctum::actingAs($user);

        $this->getJson("/api/admin/manage-venues/{$venue->id}/nfc-tags")
            ->assertForbidden();

        $this->postJson("/api/admin/manage-venues/{$venue->id}/nfc-tags", [
            'label' => 'Blocked',
        ])->assertForbidden();
    }

    public function test_admin_can_regenerate_nfc_token(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createPublishedVenue();
        $tag = $this->createNfcTag($venue);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/admin/nfc-tags/{$tag->id}", [
            'regenerate_token' => true,
        ]);

        $response->assertOk();
        $this->assertNotSame($tag->token, $response->json('tag.token'));
        $this->assertDatabaseMissing('nfc_tags', ['id' => $tag->id, 'token' => $tag->token]);
    }
}
