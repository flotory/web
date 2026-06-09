<?php

namespace Tests\Feature;

use App\Mail\DemoLeadNotificationMail;
use App\Models\DemoLead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PublicDemoBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_configured_calendly_url(): void
    {
        config(['flotory.demo_calendly_url' => 'https://calendly.com/flotory/demo']);

        $this->getJson('/api/public/demo-booking')
            ->assertOk()
            ->assertJsonPath('calendly_url', 'https://calendly.com/flotory/demo');
    }

    public function test_returns_null_calendly_url_when_unconfigured(): void
    {
        config(['flotory.demo_calendly_url' => null]);

        $this->getJson('/api/public/demo-booking')
            ->assertOk()
            ->assertJsonPath('calendly_url', null);
    }

    public function test_stores_demo_lead_and_notifies_team(): void
    {
        Mail::fake();

        config([
            'flotory.demo_notify_email' => 'sales@flotory.com',
        ]);

        $this->postJson('/api/public/demo-leads', [
            'name' => 'Alex Owner',
            'email' => 'alex@example.com',
            'venue_name' => 'Harbor Cafe',
            'city' => 'Gdansk',
            'venue_type' => 'cafe',
            'message' => 'Replacing paper cards',
            'source' => 'book-demo',
            'utm_source' => 'landing',
            'utm_campaign' => 'hero',
        ])
            ->assertCreated()
            ->assertJsonPath('lead.id', 1)
            ->assertJsonPath('message', 'Thanks — pick a time below when you are ready.');

        $this->assertDatabaseHas('demo_leads', [
            'email' => 'alex@example.com',
            'venue_name' => 'Harbor Cafe',
            'source' => 'book-demo',
        ]);

        Mail::assertSent(DemoLeadNotificationMail::class, function (DemoLeadNotificationMail $mail): bool {
            return $mail->hasTo('sales@flotory.com')
                && $mail->lead->email === 'alex@example.com';
        });
    }

    public function test_honeypot_submissions_are_accepted_without_persisting(): void
    {
        Mail::fake();

        $this->postJson('/api/public/demo-leads', [
            'name' => 'Bot',
            'email' => 'bot@example.com',
            'company_website' => 'https://spam.test',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Thanks — we will be in touch shortly.');

        $this->assertSame(0, DemoLead::query()->count());
        Mail::assertNothingSent();
    }
}
