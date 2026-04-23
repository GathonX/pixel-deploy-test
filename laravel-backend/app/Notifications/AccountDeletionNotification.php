<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class AccountDeletionNotification extends Notification
{
    use Queueable;

    public string $url;

    public function __construct(string $url)
    {
        $this->url = $url;
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Confirmez la suppression de votre compte')
            ->line("Vous avez demandé la suppression de votre compte PixelRise.")
            ->action('Supprimer mon compte', $this->url)
            ->line("Si vous n’êtes pas à l'origine de cette demande, ignorez cet e-mail.");
    }
}
