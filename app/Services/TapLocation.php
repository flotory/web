<?php

namespace App\Services;

/**
 * Coordinates asserted by the client at the moment of an NFC tap.
 *
 * Client-asserted (BUSINESS_RULES S10) — a mock-location app can forge this.
 * It raises the cost of remote stamping; it does not prove presence.
 */
final class TapLocation
{
    public function __construct(
        public readonly float $latitude,
        public readonly float $longitude,
        public readonly ?float $accuracyMeters = null,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromRequestPayload(array $payload): ?self
    {
        $latitude = $payload['latitude'] ?? null;
        $longitude = $payload['longitude'] ?? null;

        if (! is_numeric($latitude) || ! is_numeric($longitude)) {
            return null;
        }

        $accuracy = $payload['accuracy'] ?? null;

        return new self(
            (float) $latitude,
            (float) $longitude,
            is_numeric($accuracy) ? (float) $accuracy : null,
        );
    }

    /**
     * Slack added to the geofence radius for this reading, clamped so a client
     * cannot widen its own fence by claiming a huge accuracy figure.
     */
    public function accuracyAllowanceMeters(int $maxAllowance): float
    {
        if ($this->accuracyMeters === null || $this->accuracyMeters <= 0) {
            return 0.0;
        }

        return min($this->accuracyMeters, (float) $maxAllowance);
    }
}
