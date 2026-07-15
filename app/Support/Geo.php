<?php

namespace App\Support;

final class Geo
{
    private const EARTH_RADIUS_METERS = 6_371_000.0;

    /**
     * Great-circle distance between two WGS84 points, in metres.
     */
    public static function distanceMeters(
        float $fromLatitude,
        float $fromLongitude,
        float $toLatitude,
        float $toLongitude,
    ): float {
        $fromLatRad = deg2rad($fromLatitude);
        $toLatRad = deg2rad($toLatitude);
        $deltaLat = deg2rad($toLatitude - $fromLatitude);
        $deltaLng = deg2rad($toLongitude - $fromLongitude);

        $a = sin($deltaLat / 2) ** 2
            + cos($fromLatRad) * cos($toLatRad) * sin($deltaLng / 2) ** 2;

        return self::EARTH_RADIUS_METERS * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
