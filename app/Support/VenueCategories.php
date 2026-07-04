<?php

namespace App\Support;

class VenueCategories
{
    /** @var list<string> */
    public const ALL = [
        'cafe',
        'bakery',
        'restaurant',
        'bar',
        'wine_bar',
        'quick_service',
        'salon',
        'spa',
        'gym',
        'retail',
        'pet_care',
        'other',
    ];

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return self::ALL;
    }

    public static function isValid(?string $category): bool
    {
        return is_string($category) && in_array($category, self::ALL, true);
    }

    public static function normalize(?string $category): string
    {
        return self::isValid($category) ? $category : 'cafe';
    }
}
