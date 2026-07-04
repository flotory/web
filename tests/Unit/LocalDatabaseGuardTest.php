<?php

namespace Tests\Unit;

use App\Support\LocalDatabaseGuard;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class LocalDatabaseGuardTest extends TestCase
{
    public function test_blocks_destructive_commands_on_local_mysql_without_opt_in(): void
    {
        $this->app->instance('env', 'local');
        Config::set('database.default', 'mysql');
        putenv('FLOTORY_ALLOW_DESTRUCTIVE_DB');
        unset($_ENV['FLOTORY_ALLOW_DESTRUCTIVE_DB'], $_SERVER['FLOTORY_ALLOW_DESTRUCTIVE_DB']);

        $this->assertTrue(LocalDatabaseGuard::blocksDestructiveCommand('migrate:fresh'));
        $this->assertTrue(LocalDatabaseGuard::blocksDestructiveCommand('migrate:refresh'));
        $this->assertTrue(LocalDatabaseGuard::blocksDestructiveCommand('db:wipe'));
        $this->assertFalse(LocalDatabaseGuard::blocksDestructiveCommand('migrate'));
    }

    public function test_allows_destructive_commands_outside_local_environment(): void
    {
        Config::set('database.default', 'mysql');

        $this->assertFalse(LocalDatabaseGuard::blocksDestructiveCommand('migrate:fresh'));
    }

    public function test_allows_destructive_commands_on_local_sqlite(): void
    {
        Config::set('database.default', 'sqlite');

        $this->assertFalse(LocalDatabaseGuard::blocksDestructiveCommand('migrate:fresh'));
    }

    public function test_allows_destructive_commands_when_explicitly_opted_in(): void
    {
        $this->app->instance('env', 'local');
        Config::set('database.default', 'mysql');
        putenv('FLOTORY_ALLOW_DESTRUCTIVE_DB=1');
        $_ENV['FLOTORY_ALLOW_DESTRUCTIVE_DB'] = '1';
        $_SERVER['FLOTORY_ALLOW_DESTRUCTIVE_DB'] = '1';

        $this->assertFalse(LocalDatabaseGuard::blocksDestructiveCommand('migrate:fresh'));
    }
}
