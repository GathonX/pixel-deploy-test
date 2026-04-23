<?php

namespace App\Mail\StudioDomaine;

use App\Models\StudioRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StudioRequestInProgressMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StudioRequest $studioRequest)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⚙️ Votre demande {$this->studioRequest->domain} est en cours de traitement",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.studio-domaine.in-progress',
            with: ['studioRequest' => $this->studioRequest],
        );
    }
}
