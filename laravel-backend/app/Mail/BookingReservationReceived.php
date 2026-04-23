<?php

namespace App\Mail;

use App\Models\BookingReservation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BookingReservationReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public BookingReservation $reservation,
        public string $siteName = ''
    ) {}

    public function build(): self
    {
        $clientName = $this->reservation->client_name ?? 'Client';

        return $this
            ->from(config('mail.from.address'), config('mail.from.name'))
            ->replyTo($this->reservation->client_email ?? config('mail.from.address'), $clientName)
            ->subject('📅 Nouvelle réservation reçue — ' . $clientName)
            ->view('emails.booking-reservation-received');
    }
}
