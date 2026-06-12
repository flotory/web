<?php

namespace App\Console\Commands;

use App\Models\Venue;
use App\Services\VenueTimezoneService;
use Illuminate\Console\Command;

class SyncVenueTimezonesCommand extends Command
{
    protected $signature = 'venues:sync-timezones
                            {--venue= : Sync a single venue by ID}
                            {--force : Re-fetch even when timezone is already set}
                            {--dry-run : Show what would change without saving}';

    protected $description = 'Resolve venue timezones from coordinates via Google Time Zone API';

    public function handle(VenueTimezoneService $timezones): int
    {
        if (! filled(config('services.google.maps_server_key'))) {
            $this->error('GOOGLE_MAPS_SERVER_API_KEY is not set. Add a server API key with Time Zone API enabled.');

            return self::FAILURE;
        }

        $query = Venue::query()
            ->when(
                $this->option('venue'),
                fn ($builder) => $builder->whereKey((int) $this->option('venue')),
            )
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->orderBy('id');

        $venues = $query->get();

        if ($venues->isEmpty()) {
            $this->warn('No venues with coordinates found.');

            return self::SUCCESS;
        }

        $force = (bool) $this->option('force');
        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($venues as $venue) {
            if (! $force && filled($venue->timezone)) {
                $skipped++;
                continue;
            }

            $resolved = $timezones->resolveForCoordinates(
                (float) $venue->latitude,
                (float) $venue->longitude,
            );

            if ($resolved === null) {
                $failed++;
                $this->line("  <fg=red>failed</> #{$venue->id} {$venue->name} ({$venue->latitude}, {$venue->longitude})");

                continue;
            }

            if ($dryRun) {
                $previous = $venue->timezone ?? 'null';
                $this->line("  <fg=yellow>would set</> #{$venue->id} {$venue->name}: {$previous} → {$resolved}");
                $updated++;

                continue;
            }

            $venue->forceFill(['timezone' => $resolved])->save();
            $updated++;
            $this->line("  <fg=green>updated</> #{$venue->id} {$venue->name} → {$resolved}");
        }

        $this->newLine();
        $this->info(sprintf(
            'Done. %d updated, %d skipped (already set), %d failed.%s',
            $updated,
            $skipped,
            $failed,
            $dryRun ? ' (dry run)' : '',
        ));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
