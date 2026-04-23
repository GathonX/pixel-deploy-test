<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class ReservationsUnlockedSummary extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $blockedReservations;
    public $reservationCount;
    public $dashboardUrl;

    /**
     * Créer une nouvelle instance du message d'email de résumé
     *
     * @param User $user
     * @param Collection $blockedReservations
     */
    public function __construct(User $user, Collection $blockedReservations)
    {
        $this->user = $user;
        $this->blockedReservations = $blockedReservations;
        $this->reservationCount = $blockedReservations->count();
        $this->dashboardUrl = env('FRONTEND_URL') . '/dashboard/reservations';
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->from(config('mail.from.address'), config('mail.from.name'))
                    ->subject('🎉 Fonctionnalité Réservations Réactivée - ' . $this->reservationCount . ' réservation(s) débloquée(s)')
                    ->view('emails.reservations-unlocked-summary');
    }
}
