<?php

namespace App\Mail;

use App\Models\OwnerInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OwnerInvitationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public OwnerInvitation $invitation,
        public string $registerUrl,
    ) {}

    public function envelope(): Envelope
    {
        $venueName = $this->invitation->venue?->name
            ?? $this->invitation->business_name
            ?? 'your venue';

        $subject = $this->invitation->venue_id === null
            ? "You're invited to launch {$venueName} on Flotory"
            : "You're invited to manage {$venueName} on Flotory";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.owner-invitation',
            with: [
                'venueName' => $this->invitation->venue?->name ?? $this->invitation->business_name ?? 'your venue',
                'registerUrl' => $this->registerUrl,
                'expiresAt' => $this->invitation->expires_at->timezone(config('app.timezone'))->format('j F Y'),
                'isNewVenueOnboarding' => $this->invitation->venue_id === null,
            ],
        );
    }
}
