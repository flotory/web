<?php

namespace App\Console\Commands;

use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoAccountsSeeder;
use Database\Seeders\DemoCampaignsSeeder;
use Illuminate\Console\Command;

class EnsureLocalDemoCommand extends Command
{
    protected $signature = 'app:ensure-local-demo
                            {--with-demo-data : Also refresh full demo venues, cards, visits, and unlocks}';

    protected $description = 'Ensure demo login accounts exist (owner@example.com / password) without resetting the database';

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->warn('Skipped demo seeding: app:ensure-local-demo only runs when APP_ENV=local.');

            return self::SUCCESS;
        }

        $this->call('db:seed', [
            '--class' => DemoAccountsSeeder::class,
            '--force' => true,
        ]);

        if ($this->option('with-demo-data')) {
            $this->call('db:seed', [
                '--class' => DemoCampaignsSeeder::class,
                '--force' => true,
            ]);

            $this->info('Refreshing demo loyalty data (venues, per-venue cards, visits, unlocks)…');
            $this->call('db:seed', [
                '--class' => DatabaseSeeder::class,
                '--force' => true,
            ]);
        }

        $this->info('Demo logins ready: admin@flotory.com, owner@example.com, staff@example.com, customer@example.com — password: password');

        return self::SUCCESS;
    }
}
