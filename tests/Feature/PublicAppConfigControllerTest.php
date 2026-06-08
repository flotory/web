<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicAppConfigControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_google_maps_key_when_configured(): void
    {
        config(['services.google.maps_key' => 'test-maps-key']);

        $this->getJson('/api/public/app-config')
            ->assertOk()
            ->assertJsonPath('google_maps_key', 'test-maps-key');
    }

    public function test_returns_null_google_maps_key_when_missing(): void
    {
        config(['services.google.maps_key' => '']);

        $this->getJson('/api/public/app-config')
            ->assertOk()
            ->assertJsonPath('google_maps_key', null);
    }

    public function test_returns_google_oauth_client_id_when_configured(): void
    {
        config(['services.google.client_id' => 'test-oauth-client-id']);

        $this->getJson('/api/public/app-config')
            ->assertOk()
            ->assertJsonPath('google_oauth_client_id', 'test-oauth-client-id');
    }
}
