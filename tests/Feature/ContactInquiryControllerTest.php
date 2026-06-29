<?php

namespace Tests\Feature;

use App\Mail\ContactInquiryMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactInquiryControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_form_sends_mail(): void
    {
        Mail::fake();

        $this->postJson('/api/contact', [
            'name' => 'Harbor Owner',
            'email' => 'owner@harbor.test',
            'venue_name' => 'Harbor Coffee',
            'message' => 'We would like to launch NFC loyalty at our cafe.',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Thanks — we received your message.');

        Mail::assertSent(ContactInquiryMail::class, function (ContactInquiryMail $mail): bool {
            return $mail->hasTo(config('flotory.support_email'))
                && $mail->inquiry['email'] === 'owner@harbor.test'
                && $mail->inquiry['venue_name'] === 'Harbor Coffee';
        });
    }

    public function test_contact_form_validates_required_fields(): void
    {
        $this->postJson('/api/contact', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'message']);
    }
}
