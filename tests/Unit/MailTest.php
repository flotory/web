<?php

namespace Tests\Unit;

use App\Mail\PasswordResetMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class MailTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_password_reset_mail_renders_expected_content(): void
    {
        $user = $this->createUser(['name' => 'Ada Lovelace']);

        $mail = new PasswordResetMail('https://app.example.com/reset-password?token=abc', $user);

        $this->assertSame('Reset your Flotory password', $mail->envelope()->subject);
        $this->assertSame('mail.password-reset', $mail->content()->markdown);
        $this->assertSame('Ada Lovelace', $mail->content()->with['userName']);
        $this->assertStringContainsString('reset-password?token=abc', $mail->render());
    }
}
