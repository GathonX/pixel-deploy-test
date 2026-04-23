<?php

namespace App\Mail;

use App\Models\Reservation;
use App\Models\UserFeatureAccess;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ReservationReceived extends Mailable
{
    use Queueable, SerializesModels;

    public $reservation;
    public $hasAccess;          // ✅ NOUVEAU : true si accès actif
    public $isExpired;          // ✅ NOUVEAU : true si expiré (a déjà acheté)
    public $neverPurchased;     // ✅ NOUVEAU : true si jamais acheté
    public $featurePurchaseUrl;

    public function __construct(Reservation $reservation)
    {
        $this->reservation = $reservation;

        // ✅ Vérifier l'état de la fonctionnalité Réservation
        $accessStatus = $this->checkReservationFeatureStatus();
        $this->hasAccess = $accessStatus['hasAccess'];
        $this->isExpired = $accessStatus['isExpired'];
        $this->neverPurchased = $accessStatus['neverPurchased'];

        // ✅ Marquer l'email comme bloqué si pas d'accès
        if (!$this->hasAccess) {
            $this->reservation->email_was_blocked = true;
            $this->reservation->save();
        }

        // ✅ URL pour activer/réactiver la fonctionnalité
        $this->featurePurchaseUrl = env('FRONTEND_URL') . '/features';
    }

    /**
     * Vérifier l'état de la fonctionnalité Réservation
     * Retourne: hasAccess, isExpired, neverPurchased
     */
    private function checkReservationFeatureStatus(): array
    {
        try {
            $userId = $this->reservation->user_id;

            if (!$userId) {
                // Pas d'user_id = fail-safe, on laisse passer
                return ['hasAccess' => true, 'isExpired' => false, 'neverPurchased' => false];
            }

            // Chercher la fonctionnalité "Reservation" pour cet utilisateur
            $reservationFeature = UserFeatureAccess::where('user_id', $userId)
                ->where('admin_enabled', true)
                ->whereHas('feature', function ($query) {
                    $query->where('key', 'reservations')
                          ->orWhere('key', 'reservation')
                          ->orWhere('name', 'LIKE', '%réservation%')
                          ->orWhere('name', 'LIKE', '%reservation%');
                })
                ->first();

            // ✅ CAS 1 : Jamais acheté
            if (!$reservationFeature) {
                Log::info("📧 [ReservationEmail] User {$userId}: Jamais acheté la fonctionnalité");
                return ['hasAccess' => false, 'isExpired' => false, 'neverPurchased' => true];
            }

            // ✅ CAS 2 : Vérifier si expiré
            if ($reservationFeature->expires_at && Carbon::parse($reservationFeature->expires_at)->isPast()) {
                Log::info("📧 [ReservationEmail] User {$userId}: Fonctionnalité expirée");
                return ['hasAccess' => false, 'isExpired' => true, 'neverPurchased' => false];
            }

            // ✅ CAS 3 : Vérifier si user_activated
            if (!$reservationFeature->user_activated) {
                Log::info("📧 [ReservationEmail] User {$userId}: Fonctionnalité désactivée par l'utilisateur");
                return ['hasAccess' => false, 'isExpired' => true, 'neverPurchased' => false];
            }

            // ✅ CAS 4 : Accès actif
            Log::info("📧 [ReservationEmail] User {$userId}: Accès actif");
            return ['hasAccess' => true, 'isExpired' => false, 'neverPurchased' => false];

        } catch (\Exception $e) {
            Log::error('Erreur vérification fonctionnalité Réservation: ' . $e->getMessage());
            // En cas d'erreur, on laisse passer (fail-safe)
            return ['hasAccess' => true, 'isExpired' => false, 'neverPurchased' => false];
        }
    }

    public function build()
    {
        return $this->from($this->reservation->email, $this->reservation->name)
                    ->subject('Nouvelle réservation reçue - ' . $this->reservation->name)
                    ->view('emails.reservation-received');
    }
}
