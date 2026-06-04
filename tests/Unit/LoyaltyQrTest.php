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

    public function test_redeem_qr_payload_is_not_parsed_as_stamp(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';
        $payload = LoyaltyQr::redeemQrPayload($token);

        $this->assertSame(
            ['type' => 'redeem', 'token' => $token],
            LoyaltyQr::parse($payload),
        );
    }

    public function test_parses_redeem_url_with_path_anywhere_in_string(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';

        $this->assertSame(
            ['type' => 'redeem', 'token' => $token],
            LoyaltyQr::parse("https://flotory.com/r/{$token}?x=1"),
        );
    }

    public function test_builds_redeem_qr_payload(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';

        $this->assertSame("flotory:redeem:{$token}", LoyaltyQr::redeemQrPayload($token));
    }

    public function test_parses_member_qr_payload_as_stamp(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';
        $payload = LoyaltyQr::memberQrPayload($token);

        $this->assertSame("flotory:member:{$token}", $payload);
        $this->assertSame(
            ['type' => 'stamp', 'token' => $token],
            LoyaltyQr::parse($payload),
        );
    }

    public function test_member_qr_payload_is_not_parsed_as_redeem(): void
    {
        $token = '550e8400-e29b-41d4-a716-446655440000';

        $this->assertSame(
            ['type' => 'stamp', 'token' => $token],
            LoyaltyQr::parse(LoyaltyQr::memberQrPayload($token)),
        );
    }
}
