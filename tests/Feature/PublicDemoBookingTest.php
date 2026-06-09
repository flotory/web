<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicDemoBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_configured_calendly_url(): void
    {
        config(['flotory.demo_calendly_url' => 'https://calendly.com/flotory/demo']);

        $this->getJson('/api/public/demo-booking')
            ->assertOk()
            ->assertJsonPath('calendly_url', 'https://calendly.com/flotory/demo');
    }

    public function test_returns_null_calendly_url_when_unconfigured(): void
    {
        config(['flotory.demo_calendly_url' => null]);

        $this->getJson('/api/public/demo-booking')
            ->assertOk()
            ->assertJsonPath('calendly_url', null);
    }
}
