<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseMigrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrations_create_flotory_schema(): void
    {
        $this->assertTrue(Schema::hasTable('users'));
        $this->assertTrue(Schema::hasTable('venues'));
        $this->assertTrue(Schema::hasTable('venue_users'));
        $this->assertTrue(Schema::hasTable('customers'));
        $this->assertTrue(Schema::hasTable('rewards'));
        $this->assertTrue(Schema::hasTable('visits'));
        $this->assertTrue(Schema::hasTable('reward_unlocks'));
        $this->assertTrue(Schema::hasTable('customer_reward_cycles'));
        $this->assertTrue(Schema::hasTable('customer_notes'));
        $this->assertTrue(Schema::hasTable('campaigns'));
        $this->assertTrue(Schema::hasTable('platform_settings'));
        $this->assertTrue(Schema::hasTable('venue_setup_files'));
        $this->assertTrue(Schema::hasTable('nfc_tags'));
        $this->assertTrue(Schema::hasTable('stamp_events'));
        $this->assertTrue(Schema::hasTable('activity_log'));

        $this->assertTrue(Schema::hasColumn('users', 'birthday'));
        $this->assertFalse(Schema::hasColumn('customers', 'qr_token'));

        $this->assertFalse(Schema::hasTable('redemption_requests'));
        $this->assertFalse(Schema::hasTable('venue_staff_invitations'));
        $this->assertFalse(Schema::hasTable('user_stamp_tokens'));
        $this->assertFalse(Schema::hasTable('demo_leads'));
    }

    public function test_fresh_migrate_command_succeeds(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->artisan('migrate')->assertSuccessful();
        } else {
            $this->artisan('migrate:fresh')->assertSuccessful();
        }

        $this->assertTrue(Schema::hasTable('nfc_tags'));
        $this->assertFalse(Schema::hasTable('redemption_requests'));
    }
}
