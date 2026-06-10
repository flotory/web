<?php

namespace App\Services;

final class StampAwardContext
{
    public const SOURCE_STAFF_SCAN = 'staff_scan';

    public const SOURCE_NFC_TAP = 'nfc_tap';

    public function __construct(
        public readonly string $source = self::SOURCE_STAFF_SCAN,
    ) {}

    public static function staffScan(): self
    {
        return new self(self::SOURCE_STAFF_SCAN);
    }

    public static function nfcTap(): self
    {
        return new self(self::SOURCE_NFC_TAP);
    }

    public function isNfcTap(): bool
    {
        return $this->source === self::SOURCE_NFC_TAP;
    }

    public function appliesCampaignMultiplier(): bool
    {
        return ! $this->isNfcTap();
    }

    public function recordsStaffOnVisit(): bool
    {
        return ! $this->isNfcTap();
    }
}
