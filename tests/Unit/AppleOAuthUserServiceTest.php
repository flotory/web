<?php

namespace Tests\Unit;

use App\Services\AppleOAuthUserService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppleOAuthUserServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_user_with_name_from_email_when_apple_name_missing(): void
    {
        $user = app(AppleOAuthUserService::class)->findOrCreate([
            'apple_id' => 'apple-user-abc',
            'email' => 'jane.doe@icloud.com',
            'name' => '',
        ]);

        $this->assertSame('Jane Doe', $user->name);
        $this->assertSame('jane.doe@icloud.com', $user->email);
    }

    public function test_upgrades_placeholder_name_on_return_sign_in(): void
    {
        $existing = User::query()->create([
            'name' => 'Guest',
            'email' => 'apple_user@privaterelay.flotory.local',
            'password' => 'password',
            'is_admin' => false,
            'apple_id' => 'apple-user-abc',
        ]);

        $user = app(AppleOAuthUserService::class)->findOrCreate([
            'apple_id' => 'apple-user-abc',
            'email' => 'jane.doe@icloud.com',
            'name' => '',
        ]);

        $this->assertTrue($existing->is($user));
        $this->assertSame('Jane Doe', $user->fresh()->name);
        $this->assertSame('jane.doe@icloud.com', $user->fresh()->email);
    }
}
