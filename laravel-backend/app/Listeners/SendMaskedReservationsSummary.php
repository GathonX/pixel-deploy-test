<?php

namespace App\Listeners;

use App\Events\FeatureActivated;
use App\Models\Reservation;
use App\Models\User;
use App\Mail\ReservationsSummary;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendMaskedReservationsSummary
{
    public function handle(FeatureActivated $event)
    {
        // Vérifier si c'est la feature réservation
        if ($event->featureKey !== 'reservation') {
            return;
        }

        // Récupérer toutes les réservations masquées pour cet utilisateur
        $maskedReservations = Reservation::where('client_id', $event->userId)
            ->where('is_masked', true)
            ->orderBy('created_at', 'desc')
            ->get();

        // Si aucune réservation masquée, ne rien faire
        if ($maskedReservations->isEmpty()) {
            return;
        }

        // Démasquer toutes les réservations
        Reservation::where('client_id', $event->userId)
            ->where('is_masked', true)
            ->update(['is_masked' => false]);

        // Récupérer l'utilisateur
        $user = User::find($event->userId);

        if (!$user || !$user->email) {
            Log::warning("Impossible d'envoyer l'email récapitulatif : utilisateur {$event->userId} non trouvé ou sans email");
            return;
        }

        // Envoyer l'email récapitulatif
        try {
            Mail::to($user->email)->send(new ReservationsSummary($maskedReservations));
            Log::info("Email récapitulatif envoyé à {$user->email} pour {$maskedReservations->count()} réservation(s) démasquée(s)");
        } catch (\Exception $e) {
            Log::error("Erreur lors de l'envoi de l'email récapitulatif : " . $e->getMessage());
        }
    }
}
