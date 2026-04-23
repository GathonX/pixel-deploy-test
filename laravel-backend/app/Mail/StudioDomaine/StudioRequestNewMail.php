<?php

namespace App\Mail\StudioDomaine;

use App\Models\StudioRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StudioRequestNewMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StudioRequest $studioRequest)
    {
        $this->studioRequest->load('user');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🌐 Nouvelle demande de domaine - {$this->studioRequest->domain}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.studio-domaine.new-request',
            with: ['studioRequest' => $this->studioRequest],
        );
    }
}
