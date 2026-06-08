<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class AdminPaletteControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_public_palette_returns_defaults(): void
    {
        $this->getJson('/api/public/palette')
            ->assertOk()
            ->assertJsonPath('palette.primary', '#050D1E')
            ->assertJsonPath('palette.accent', '#D7A35D');
    }

    public function test_admin_can_read_palette_catalog(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/palette')
            ->assertOk()
            ->assertJsonStructure([
                'defaults' => ['primary', 'accent', 'bg'],
                'current' => ['primary', 'accent', 'bg'],
                'overrides',
                'tokens' => [
                    ['key', 'label', 'description', 'group'],
                ],
            ]);
    }

    public function test_admin_can_update_and_reset_palette(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/admin/palette', [
            'palette' => [
                'primary' => '#112233',
                'accent' => '#AABBCC',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('current.primary', '#112233')
            ->assertJsonPath('current.accent', '#AABBCC');

        $this->assertDatabaseHas('platform_settings', [
            'key' => 'palette',
        ]);

        $this->postJson('/api/admin/palette/reset')
            ->assertOk()
            ->assertJsonPath('current.primary', '#050D1E')
            ->assertJsonPath('overrides', []);

        $this->assertDatabaseMissing('platform_settings', [
            'key' => 'palette',
        ]);
    }

    public function test_non_admin_cannot_access_palette_admin_routes(): void
    {
        $user = $this->createUser(['is_admin' => false]);
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/palette')->assertForbidden();
        $this->patchJson('/api/admin/palette', ['palette' => ['primary' => '#112233']])->assertForbidden();
    }
}
