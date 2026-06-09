<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Config;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        // Docker Compose sets APP_ENV=local and DB_CONNECTION=mysql on the app container,
        // which overrides phpunit.xml. Force an isolated in-memory sqlite DB for tests.
        putenv('APP_ENV=testing');
        $_ENV['APP_ENV'] = 'testing';
        $_SERVER['APP_ENV'] = 'testing';
        putenv('DB_CONNECTION=sqlite');
        $_ENV['DB_CONNECTION'] = 'sqlite';
        $_SERVER['DB_CONNECTION'] = 'sqlite';
        putenv('DB_DATABASE=:memory:');
        $_ENV['DB_DATABASE'] = ':memory:';
        $_SERVER['DB_DATABASE'] = ':memory:';

        return parent::createApplication();
    }

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('broadcasting.default', 'log');
    }
}
