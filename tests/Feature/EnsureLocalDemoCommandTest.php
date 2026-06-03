<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnsureLocalDemoCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_skips_seeding_when_not_local_environment(): void
    {
        app()->detectEnvironment(fn (): string => 'production');

        $this->artisan('app:ensure-local-demo')
            ->expectsOutputToContain('Skipped demo seeding')
            ->assertSuccessful();

        $this->assertDatabaseMissing('users', [
            'email' => 'owner@example.com',
        ]);
    }

    public function test_command_seeds_demo_owner_when_local_environment(): void
    {
        app()->detectEnvironment(fn (): string => 'local');

        $this->artisan('app:ensure-local-demo')
            ->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'owner@example.com',
        ]);
    }
}
