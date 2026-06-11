<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReconcileConsolidatedMigrationsCommand extends Command
{
    protected $signature = 'migrate:reconcile-consolidated';

    protected $description = 'Mark consolidated migrations as run when upgrading an existing production database';

    public function handle(): int
    {
        $batch = (int) (DB::table('migrations')->max('batch') ?? 0);
        $marked = 0;

        foreach ($this->migrationProbes() as $migration => $alreadyApplied) {
            if (! $alreadyApplied() || $this->migrationRecorded($migration)) {
                continue;
            }

            DB::table('migrations')->insert([
                'migration' => $migration,
                'batch' => $batch + 1,
            ]);
            $batch++;
            $marked++;
            $this->info("Marked {$migration} as migrated.");
        }

        if ($marked === 0) {
            $this->line('No consolidated migrations needed reconciliation.');
        }

        return self::SUCCESS;
    }

    private function migrationRecorded(string $migration): bool
    {
        return DB::table('migrations')->where('migration', $migration)->exists();
    }

    /**
     * @return array<string, callable(): bool>
     */
    private function migrationProbes(): array
    {
        return [
            '2026_06_01_000000_create_laravel_infrastructure_tables' => static fn (): bool => Schema::hasTable('personal_access_tokens')
                || Schema::hasTable('sessions')
                || Schema::hasTable('password_reset_tokens'),
            '2026_06_01_000001_create_flotory_schema' => static fn (): bool => Schema::hasTable('users'),
        ];
    }
}
