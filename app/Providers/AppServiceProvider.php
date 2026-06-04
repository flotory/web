<?php

namespace App\Providers;

use Illuminate\Console\Events\CommandFinished;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
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
