<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactInquiryMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  array{name: string, email: string, venue_name: string|null, message: string}  $inquiry
     */
    public function __construct(public array $inquiry) {}

    public function envelope(): Envelope
    {
        $venue = filled($this->inquiry['venue_name'] ?? null)
            ? " — {$this->inquiry['venue_name']}"
            : '';

        return new Envelope(
            subject: "Flotory contact{$venue}",
            replyTo: [$this->inquiry['email']],
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.contact-inquiry',
            with: [
                'inquiryName' => $this->inquiry['name'],
                'inquiryEmail' => $this->inquiry['email'],
                'inquiryVenueName' => $this->inquiry['venue_name'] ?? null,
                'inquiryMessage' => $this->inquiry['message'],
            ],
        );
    }
}
