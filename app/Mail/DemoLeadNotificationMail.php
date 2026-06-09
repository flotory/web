<?php

namespace App\Mail;

use App\Models\DemoLead;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DemoLeadNotificationMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public DemoLead $lead,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New Flotory demo lead: {$this->lead->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.demo-lead-notification',
            with: [
                'lead' => $this->lead,
            ],
        );
    }
}
