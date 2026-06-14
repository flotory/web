<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicAppConfigControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_google_maps_key_when_configured(): void
    {
        config(['services.google.maps_browser_key' => 'test-maps-key']);

        $this->getJson('/api/public/app-config')
            ->assertOk()
            ->assertJsonPath('google_maps_key', 'test-maps-key');
    }

    public function test_returns_null_google_maps_key_when_missing(): void
    {
        config(['services.google.maps_browser_key' => '']);

        $this->getJson('/api/public/app-config')
            ->assertOk()
            ->assertJsonPath('google_maps_key', null);
    }

    public function test_returns_mobile_update_policy_fields(): void
    {
        config([
            'flotory.min_ios_version' => '1.0.13',
            'flotory.min_android_version' => '1.0.12',
            'flotory.force_update' => true,
            'flotory.ios_update_url' => 'https://flotory.com/app',
            'flotory.android_update_url' => 'https://flotory.com/app',
        ]);

        $this->getJson('/api/public/app-config')
            ->assertOk()
            ->assertJsonPath('min_ios_version', '1.0.13')
            ->assertJsonPath('min_android_version', '1.0.12')
            ->assertJsonPath('force_update', true)
            ->assertJsonPath('ios_update_url', 'https://flotory.com/app')
            ->assertJsonPath('android_update_url', 'https://flotory.com/app');
    }

    public function test_returns_null_minimum_versions_when_unset(): void
    {
        config([
            'flotory.min_ios_version' => null,
            'flotory.min_android_version' => '',
            'flotory.force_update' => false,
        ]);

        $this->getJson('/api/public/app-config')
            ->assertOk()
            ->assertJsonPath('min_ios_version', null)
            ->assertJsonPath('min_android_version', null)
            ->assertJsonPath('force_update', false);
    }
}
