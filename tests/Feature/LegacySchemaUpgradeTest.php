<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LegacySchemaUpgradeTest extends TestCase
{
    use RefreshDatabase;

    public function test_upgrade_migration_noops_when_brand_schema_already_exists(): void
    {
        $this->artisan('migrate')->assertSuccessful();

        $this->assertTrue(Schema::hasTable('brands'));

        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_07_07_000000_upgrade_legacy_schema_to_brands.php',
        ])->assertSuccessful();

        $this->artisan('migrate', [
            '--path' => 'database/migrations/2026_07_07_000001_add_venue_location_status.php',
        ])->assertSuccessful();

        $this->assertTrue(Schema::hasColumn('venues', 'location_status'));
    }
}
