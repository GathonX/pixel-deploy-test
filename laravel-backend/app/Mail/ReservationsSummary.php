<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ReservationsSummary extends Mailable
{
    use Queueable, SerializesModels;

    public $maskedReservations;
    public $totalCount;
    public $dashboardUrl;

    public function __construct($maskedReservations)
    {
        $this->maskedReservations = $maskedReservations;
        $this->totalCount = $maskedReservations->count();
        $this->dashboardUrl = env('FRONTEND_URL', 'https://app.pixel-rise.com') . '/dashboard/reservations';
    }

    public function build()
    {
        return $this->from('no-reply@pixel-rise.com', 'PixelRise')
                    ->subject('🎉 Vous avez récupéré l\'accès à ' . $this->totalCount . ' réservation' . ($this->totalCount > 1 ? 's' : '') . ' masquée' . ($this->totalCount > 1 ? 's' : '') . ' !')
                    ->view('emails.reservations-summary');
    }
}
