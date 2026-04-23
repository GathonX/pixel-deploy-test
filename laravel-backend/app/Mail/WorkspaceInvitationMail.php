<?php

namespace App\Mail;

use App\Models\WorkspaceInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkspaceInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $acceptUrl;
    public string $inviterName;
    public string $workspaceName;
    public string $siteName;
    public string $roleLabel;

    public function __construct(public WorkspaceInvitation $invitation)
    {
        $frontendUrl         = config('app.frontend_url', 'https://app.pixelrise.com');
        $this->acceptUrl     = "{$frontendUrl}/invitation/accept/{$invitation->token}";
        $this->inviterName   = $invitation->inviter->name ?? 'Un administrateur';
        $this->workspaceName = $invitation->workspace->name ?? 'Workspace';
        $this->siteName      = $invitation->site?->name ?? '';
        $this->roleLabel     = $invitation->role === 'admin' ? 'Administrateur' : 'Membre';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🎉 Vous avez été invité sur {$this->workspaceName} — PixelRise",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.workspace-invitation');
    }
}
