<?php

namespace App\Support;

class LocalDatabaseGuard
{
    /** @var list<string> */
    private const DESTRUCTIVE_COMMANDS = [
        'migrate:fresh',
        'migrate:refresh',
        'db:wipe',
    ];

    public static function blocksDestructiveCommand(string $command): bool
    {
        if (! app()->environment('local')) {
            return false;
        }

        if (! in_array($command, self::DESTRUCTIVE_COMMANDS, true)) {
            return false;
        }

        if (config('database.default') !== 'mysql') {
            return false;
        }

        return ! filter_var(env('FLOTORY_ALLOW_DESTRUCTIVE_DB', false), FILTER_VALIDATE_BOOLEAN);
    }

    public static function denialMessage(): string
    {
        return 'Blocked destructive database command on local MySQL (your data would be wiped). '
            .'PHPUnit and Playwright e2e use isolated sqlite — they do not need migrate:fresh. '
            .'To reset intentionally: FLOTORY_ALLOW_DESTRUCTIVE_DB=1 php artisan migrate:fresh --seed';
    }
}
