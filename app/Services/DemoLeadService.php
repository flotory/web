<?php

namespace App\Services;

use App\Mail\DemoLeadNotificationMail;
use App\Models\DemoLead;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class DemoLeadService
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(array $payload): DemoLead
    {
        $lead = DemoLead::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'venue_name' => $payload['venue_name'] ?? null,
            'city' => $payload['city'] ?? null,
            'venue_type' => $payload['venue_type'] ?? null,
            'message' => $payload['message'] ?? null,
            'source' => $payload['source'] ?? 'book-demo',
            'utm_source' => $payload['utm_source'] ?? null,
            'utm_campaign' => $payload['utm_campaign'] ?? null,
        ]);

        $this->notifyTeam($lead);

        return $lead;
    }

    private function notifyTeam(DemoLead $lead): void
    {
        $recipient = config('flotory.demo_notify_email') ?: config('mail.from.address');

        if (! is_string($recipient) || trim($recipient) === '') {
            return;
        }

        try {
            Mail::to(trim($recipient))->send(new DemoLeadNotificationMail($lead));
        } catch (Throwable $exception) {
            Log::warning('Demo lead saved but notification email failed.', [
                'demo_lead_id' => $lead->id,
                'exception' => $exception->getMessage(),
            ]);
        }
    }
}
