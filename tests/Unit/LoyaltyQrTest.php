<?php

namespace Tests\Unit;

use App\Support\LoyaltyQr;
use PHPUnit\Framework\TestCase;

class LoyaltyQrTest extends TestCase
{
    public function test_parses_bare_uuid_as_stamp(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';

        $this->assertSame(
            ['type' => 'stamp', 'token' => $token],
            LoyaltyQr::parse($token),
        );
    }

    public function test_parses_redeem_url(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';

        $this->assertSame(
            ['type' => 'redeem', 'token' => $token],
            LoyaltyQr::parse("https://flotory.com/r/{$token}"),
        );
    }

    public function test_parses_redeem_path(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';

        $this->assertSame(
            ['type' => 'redeem', 'token' => $token],
            LoyaltyQr::parse("/r/{$token}"),
        );
    }

    public function test_builds_redeem_url(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';

        $this->assertSame(
            "https://example.test/r/{$token}",
            LoyaltyQr::redeemUrl($token, 'https://example.test'),
        );
    }
}
