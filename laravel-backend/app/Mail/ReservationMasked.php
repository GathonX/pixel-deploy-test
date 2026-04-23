<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ReservationMasked extends Mailable
{
    use Queueable, SerializesModels;

    public $reservation;
    public $featurePurchaseUrl;

    public function __construct(Reservation $reservation)
    {
        $this->reservation = $reservation;
        $this->featurePurchaseUrl = env('FRONTEND_URL', 'https://app.pixel-rise.com') . '/features/purchase/1';
    }

    public function build()
    {
        return $this->from('no-reply@pixel-rise.com', 'PixelRise')
                    ->subject('🔒 Nouvelle réservation (contenu masqué)')
                    ->view('emails.reservation-masked');
    }
}
