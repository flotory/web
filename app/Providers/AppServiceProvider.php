<?php

namespace App\Providers;

use App\Support\LocalDatabaseGuard;
use Illuminate\Console\Events\CommandFinished;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Event::listen(CommandStarting::class, function (CommandStarting $event): void {
            if (! LocalDatabaseGuard::blocksDestructiveCommand($event->command)) {
                return;
            }

            throw new RuntimeException(LocalDatabaseGuard::denialMessage());
        });

        if (! $this->app->environment('local')) {
            return;
        }

        Event::listen(CommandFinished::class, function (CommandFinished $event): void {
            if ($event->exitCode !== 0) {
                return;
            }

            if (! in_array($event->command, ['migrate', 'migrate:fresh', 'migrate:refresh'], true)) {
                return;
            }

            Artisan::call('app:ensure-local-demo', ['--no-interaction' => true]);
        });
    }
}
