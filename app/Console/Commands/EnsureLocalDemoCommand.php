<?php

namespace App\Console\Commands;

use App\Models\Venue;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoAccountsSeeder;
use Database\Seeders\DemoCampaignsSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class EnsureLocalDemoCommand extends Command
{
    protected $signature = 'app:ensure-local-demo';

    protected $description = 'Ensure demo login accounts exist (owner@example.com / password) and seed full demo data when needed';

    public function handle(): int
    {
        $this->call('db:seed', [
            '--class' => DemoAccountsSeeder::class,
            '--force' => true,
        ]);

        $this->call('db:seed', [
            '--class' => DemoCampaignsSeeder::class,
            '--force' => true,
        ]);

        $marker = storage_path('.local-seeded');
        $needsFullSeed = ! File::exists($marker) || Venue::query()->count() < 2;

        if ($needsFullSeed) {
            $this->info('Running full demo seed (venues, customers, visits)…');
            $this->call('db:seed', [
                '--class' => DatabaseSeeder::class,
                '--force' => true,
            ]);
            File::put($marker, (string) now());
        }

        $this->info('Demo login: owner@example.com / password');

        return self::SUCCESS;
    }
}
