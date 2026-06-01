<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseMigrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrations_create_core_loyalty_tables(): void
    {
        $this->assertTrue(Schema::hasTable('venues'));
        $this->assertTrue(Schema::hasTable('rewards'));
        $this->assertTrue(Schema::hasTable('customers'));
        $this->assertTrue(Schema::hasTable('visits'));
        $this->assertTrue(Schema::hasTable('reward_unlocks'));
        $this->assertTrue(Schema::hasTable('redemption_requests'));
        $this->assertTrue(Schema::hasTable('venue_staff_invitations'));
        $this->assertTrue(Schema::hasTable('customer_notes'));
        $this->assertTrue(Schema::hasColumn('users', 'birthday'));
    }

    public function test_fresh_migrate_command_succeeds(): void
    {
        // SQLite in-memory cannot VACUUM inside RefreshDatabase's transaction.
        if (config('database.default') === 'sqlite') {
            $this->artisan('migrate')->assertSuccessful();
        } else {
            $this->artisan('migrate:fresh')->assertSuccessful();
        }

        $this->assertTrue(Schema::hasTable('redemption_requests'));
        $this->assertTrue(Schema::hasColumn('redemption_requests', 'reward_unlock_id'));
    }
}
