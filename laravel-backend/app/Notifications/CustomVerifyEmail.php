<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class CustomVerifyEmail extends VerifyEmail
{
    /**
     * Build the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $verifyUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Vérifiez votre adresse email')
            ->line('Merci de vous être inscrit. Veuillez vérifier votre adresse email.')
            ->action('Vérifier mon adresse email', $verifyUrl)
            ->line('Si vous n’avez pas créé de compte, ignorez cet email.');
    }

    /**
     * Génère une URL de vérification **avec le domaine BACKEND**
     */
    protected function verificationUrl($notifiable): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id'   => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );
    }
    
}
