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
}
