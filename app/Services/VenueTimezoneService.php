<?php

namespace App\Services;

use App\Models\Venue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VenueTimezoneService
{
    public function resolveForCoordinates(?float $latitude, ?float $longitude): ?string
    {
        if ($latitude === null || $longitude === null) {
            return null;
        }

        $key = config('services.google.maps_key');

        if (! filled($key)) {
            return null;
        }

        try {
            $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/timezone/json', [
                'location' => "{$latitude},{$longitude}",
                'timestamp' => now()->timestamp,
                'key' => $key,
            ]);

            if ($response->successful() && $response->json('status') === 'OK') {
                $timezoneId = $response->json('timeZoneId');

                if (is_string($timezoneId) && $timezoneId !== '') {
                    return $timezoneId;
                }
            }
        } catch (\Throwable $exception) {
            Log::warning('Venue timezone lookup failed.', [
                'exception' => $exception->getMessage(),
            ]);
        }

        return null;
    }

    public function applyToVenue(Venue $venue, ?float $latitude, ?float $longitude): void
    {
        $timezone = $this->resolveForCoordinates($latitude, $longitude);

        if ($timezone === null) {
            return;
        }

        $venue->forceFill(['timezone' => $timezone])->save();
    }
}
