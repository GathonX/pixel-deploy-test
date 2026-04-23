<?php

namespace App\Mail\StudioDomaine;

use App\Models\StudioRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StudioRequestActivatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StudioRequest $studioRequest)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "✅ Votre domaine {$this->studioRequest->domain} est activé !",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.studio-domaine.activated',
            with: ['studioRequest' => $this->studioRequest],
        );
    }
}
