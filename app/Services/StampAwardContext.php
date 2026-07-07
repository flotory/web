<?php

namespace App\Services;

final class StampAwardContext
{
    public const SOURCE_NFC_TAP = 'nfc_tap';

    public function __construct(
        public readonly string $source = self::SOURCE_NFC_TAP,
        public readonly ?int $venueId = null,
    ) {}

    public static function nfcTap(?int $venueId = null): self
    {
        return new self(self::SOURCE_NFC_TAP, $venueId);
    }

    public function isNfcTap(): bool
    {
        return $this->source === self::SOURCE_NFC_TAP;
    }

    public function appliesCampaignMultiplier(): bool
    {
        return true;
    }

    public function recordsStaffOnVisit(): bool
    {
        return false;
    }
}
