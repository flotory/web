<?php

namespace App\Mail;

use App\Models\VenueStaffInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffInvitationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public VenueStaffInvitation $invitation,
        public string $acceptUrl,
    ) {}

    public function envelope(): Envelope
    {
        $venueName = $this->invitation->venue->name;

        return new Envelope(
            subject: "You've been invited to join {$venueName} on Flotory",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.staff-invitation',
            with: [
                'inviterName' => $this->invitation->inviter->name,
                'venueName' => $this->invitation->venue->name,
                'acceptUrl' => $this->acceptUrl,
            ],
        );
    }
}
