<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class FeatureActivationRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'feature_id',
        'full_name',
        'amount_claimed',
        'payment_method',
        'payment_proofs',
        'user_message',
        'email',
        'contact_number',
        'invoice_number',
        'status',
        'processed_by',
        'admin_response',
        'processed_at',
        'billing_period',
        'original_price',
        'discount_percentage',
    ];

    protected $casts = [
        'amount_claimed' => 'decimal:2',
        'payment_proofs' => 'array',
        'processed_at' => 'datetime',
        'original_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function feature(): BelongsTo
    {
        return $this->belongsTo(Feature::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function approve(int $adminId, ?string $response = null): bool
    {
        $success = $this->update([
            'status' => 'approved',
            'processed_by' => $adminId,
            'admin_response' => $response ?? 'Demande approuvée et accès activé',
            'processed_at' => now(),
        ]);

        if ($success) {
            // Calculer la durée selon la période de facturation
            $days = ($this->billing_period === 'yearly') ? 365 : 30;

            // 🎯 VÉRIFICATION : Pas d'achat si un accès est encore actif (expires_at > NOW)
            $activeAccess = UserFeatureAccess::where('user_id', $this->user_id)
                ->where('feature_id', $this->feature_id)
                ->where('expires_at', '>', now()) // ✅ SOURCE DE VÉRITÉ = expires_at
                ->first();

            if ($activeAccess) {
                Log::warning("⚠️ Tentative d'achat avec accès actif existant", [
                    'user_id' => $this->user_id,
                    'feature_id' => $this->feature_id,
                    'existing_access_id' => $activeAccess->id,
                    'expires_at' => $activeAccess->expires_at,
                    'days_remaining' => now()->diffInDays($activeAccess->expires_at, false)
                ]);

                // Ne pas créer de nouvel accès, mais marquer la demande comme approuvée quand même
                // (l'admin a validé le paiement même si l'accès existe encore)
                return true;
            }

            // ✅ NOUVEAU : Créer un NOUVEL enregistrement UserFeatureAccess
            // La contrainte UNIQUE a été supprimée, donc plusieurs achats possibles
            $newAccess = UserFeatureAccess::create([
                'user_id' => $this->user_id,
                'feature_id' => $this->feature_id,
                'admin_enabled' => true,
                'user_activated' => false, // ✅ L'utilisateur doit encore activer manuellement
                'admin_enabled_at' => now(),
                'expires_at' => now()->addDays($days), // ✅ Selon la période (30j ou 365j)
                'admin_enabled_by' => $adminId,
                'amount_paid' => $this->amount_claimed,
                'payment_method' => $this->payment_method,
                'admin_notes' => $response,
                'status' => 'active', // ✅ status est juste informatif, expires_at est la source de vérité
                'billing_period' => $this->billing_period ?? 'monthly',
                'original_price' => $this->original_price,
                'discount_percentage' => $this->discount_percentage ?? 0,
            ]);

            Log::info("✅ Nouvel achat créé", [
                'access_id' => $newAccess->id,
                'user_id' => $this->user_id,
                'feature_id' => $this->feature_id,
                'expires_at' => $newAccess->expires_at,
                'billing_period' => $newAccess->billing_period
            ]);

            // ✅ Vérifier si c'est une réactivation de la fonctionnalité Réservation
            $this->checkAndSendReservationUnlockEmail();

            // Déclencher les actions automatiques
            $this->sendApprovalCommunications($adminId);
        }

        return $success;
    }

    public function reject(int $adminId, string $reason): bool
    {
        $success = $this->update([
            'status' => 'rejected',
            'processed_by' => $adminId,
            'admin_response' => $reason,
            'processed_at' => now(),
        ]);

        if ($success) {
            // Déclencher les actions automatiques
            $this->sendRejectionCommunications($adminId);
        }

        return $success;
    }

    /**
     * 📧✉️ Communications automatiques lors de l'approbation
     */
    private function sendApprovalCommunications(int $adminId): void
    {
        try {
            $admin = User::find($adminId);
            $user = $this->user;
            $feature = $this->feature;

            // 1️⃣ Créer réponse au ticket
            $this->createTicketResponse($admin, 'approved');

            // 2️⃣ Envoyer email de félicitations
            $this->sendApprovalEmail($user, $feature, $admin);

            // 3️⃣ Créer notification pour l'utilisateur
            $this->createUserNotification($user, $feature, 'approved');

            Log::info('✅ Communications d\'approbation envoyées', [
                'activation_request_id' => $this->id,
                'user_id' => $user->id,
                'feature_id' => $feature->id,
                'admin_id' => $adminId
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur communications approbation', [
                'activation_request_id' => $this->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * 📧✉️ Communications automatiques lors du rejet
     */
    private function sendRejectionCommunications(int $adminId): void
    {
        try {
            $admin = User::find($adminId);
            $user = $this->user;
            $feature = $this->feature;

            // 1️⃣ Créer réponse au ticket
            $this->createTicketResponse($admin, 'rejected');

            // 2️⃣ Envoyer email de rejet
            $this->sendRejectionEmail($user, $feature, $admin);

            // 3️⃣ Créer notification pour l'utilisateur
            $this->createUserNotification($user, $feature, 'rejected');

            Log::info('✅ Communications de rejet envoyées', [
                'activation_request_id' => $this->id,
                'user_id' => $user->id,
                'feature_id' => $feature->id,
                'admin_id' => $adminId
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur communications rejet', [
                'activation_request_id' => $this->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
 * 🎫 Créer réponse automatique au ticket (VERSION CORRIGÉE)
 */
private function createTicketResponse(User $admin, string $decision): void
{
    try {
        // ✅ AMÉLIORATION : Recherche plus robuste du ticket associé
        $ticket = Ticket::where('user_id', $this->user_id)
            ->where('category', 'payment')
            ->where('created_at', '>=', $this->created_at->subMinutes(5)) // Créé dans les 5 min suivant la demande
            ->where('created_at', '<=', $this->created_at->addMinutes(5))
            ->where(function($query) {
                $query->where('description', 'like', '%Référence demande : #' . $this->id . '%')
                      ->orWhere('title', 'like', '%' . $this->feature->name . '%');
            })
            ->whereIn('status', ['open', 'pending'])
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$ticket) {
            // Fallback : recherche élargie pour les anciens tickets
            $ticket = Ticket::where('user_id', $this->user_id)
                ->where('description', 'like', '%Référence demande : #' . $this->id . '%')
                ->whereIn('status', ['open', 'pending'])
                ->first();
        }

        if (!$ticket) {
            Log::warning('⚠️ Ticket non trouvé pour la demande d\'activation', [
                'activation_request_id' => $this->id,
                'user_id' => $this->user_id,
                'feature_name' => $this->feature->name,
                'created_at' => $this->created_at
            ]);
            return;
        }

        $feature = $this->feature;

        // ✅ AMÉLIORATION : Messages admin plus professionnels et modernes
        if ($decision === 'approved') {
            $adminMessage = "🎉 **Excellente nouvelle !** Votre demande d'activation pour **{$feature->name}** a été approuvée.\n\n";
            $adminMessage .= "✅ **Statut** : Fonctionnalité activée et disponible immédiatement\n";
            $adminMessage .= "💰 **Montant validé** : {$this->amount_claimed}€\n";
            $adminMessage .= "📅 **Date d'activation** : " . now()->format('d/m/Y à H:i') . "\n";
            $adminMessage .= "⏰ **Expire le** : " . now()->addDays(30)->format('d/m/Y à H:i') . " (30 jours)\n\n";

            $adminMessage .= "**🚀 Votre fonctionnalité est maintenant active :**\n";
            $adminMessage .= "✨ Accédez immédiatement à **{$feature->name}** dans votre dashboard\n";
            $adminMessage .= "🎯 Profitez de toutes les fonctionnalités pendant 30 jours\n";
            $adminMessage .= "📊 Consultez votre tableau de bord pour commencer\n\n";

            if ($this->admin_response && $this->admin_response !== 'Demande approuvée et accès activé') {
                $adminMessage .= "**💬 Message personnalisé de notre équipe :**\n";
                $adminMessage .= "_{$this->admin_response}_\n\n";
            }

            $adminMessage .= "Nous vous remercions pour votre confiance et vous souhaitons une excellente expérience avec cette nouvelle fonctionnalité !\n\n";
            $adminMessage .= "**L'équipe PixelRise** 🌟";

            // Fermer le ticket automatiquement avec succès
            $ticket->update([
                'status' => 'resolved',
                'resolved_at' => now(),
                'first_response_at' => $ticket->first_response_at ?: now()
            ]);

        } else {
            $adminMessage = "Bonjour,\n\n";
            $adminMessage .= "Nous avons examiné attentivement votre demande d'activation pour **{$feature->name}**.\n\n";
            $adminMessage .= "📋 **Statut de votre demande** : En attente d'informations complémentaires\n\n";
            $adminMessage .= "**🔍 Observations de notre équipe technique :**\n";
            $adminMessage .= "_{$this->admin_response}_\n\n";
            
            $adminMessage .= "**📝 Actions recommandées :**\n";
            $adminMessage .= "• Vérifiez et complétez les informations demandées ci-dessus\n";
            $adminMessage .= "• Soumettez une nouvelle demande avec les documents appropriés\n";
            $adminMessage .= "• N'hésitez pas à nous contacter si vous avez des questions\n\n";
            
            $adminMessage .= "Notre équipe support reste disponible pour vous accompagner dans cette démarche.\n\n";
            $adminMessage .= "**L'équipe PixelRise** 🛠️";
        }

        // ✅ CORRECTION : Créer le message ADMIN avec le bon sender
        TicketMessage::create([
            'ticket_id' => $ticket->id,
            'sender' => 'admin',  // ← IMPORTANT : sender = admin
            'text' => $adminMessage,
        ]);

        Log::info('🎫 Réponse admin créée dans le ticket', [
            'ticket_id' => $ticket->id,
            'activation_request_id' => $this->id,
            'decision' => $decision,
            'admin_id' => $admin->id
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur création réponse admin dans ticket', [
            'activation_request_id' => $this->id,
            'error' => $e->getMessage()
        ]);
    }
}

    /**
     * 📧 Envoyer email d'approbation
     */
    private function sendApprovalEmail(User $user, Feature $feature, User $admin): void
    {
        try {
            $subject = "Approbation de votre demande d'activation - {$feature->name}";

            $emailContent = "Bonjour {$this->full_name},

Nous avons le plaisir de vous informer que votre demande d'activation pour la fonctionnalité {$feature->name} a été approuvée et activée automatiquement par notre équipe.

DÉTAILS DE L'ACTIVATION
-----------------------------------------
Fonctionnalité : {$feature->name}
Montant validé : {$this->amount_claimed}€
Méthode de paiement : {$this->payment_method}
Approuvé par : {$admin->name}
Date d'activation : " . now()->format('d/m/Y à H:i') . "
Date d'expiration : " . now()->addDays(30)->format('d/m/Y à H:i') . " (30 jours)

VOTRE FONCTIONNALITÉ EST ACTIVE !
-----------------------------------------
✨ Votre fonctionnalité {$feature->name} est maintenant disponible immédiatement
🎯 Durée d'utilisation : 30 jours à compter d'aujourd'hui
📊 Accédez à toutes les fonctionnalités via votre dashboard

Lien direct : " . config('app.frontend_url') . "/features

MESSAGE DE NOTRE ÉQUIPE
-----------------------------------------
" . ($this->admin_response ?: 'Nous vous remercions de votre confiance et vous souhaitons une excellente utilisation de cette fonctionnalité.') . "

LIENS UTILES
-----------------------------------------
• Tableau de bord : " . config('app.frontend_url') . "/dashboard
• Mes fonctionnalités : " . config('app.frontend_url') . "/features
• Support technique : " . config('app.frontend_url') . "/dashboard/tickets

Nous restons à votre disposition pour toute question.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            Mail::raw($emailContent, function ($message) use ($subject) {
                $message->to($this->email)
                        ->subject($subject);
            });

            Log::info('📧 Email approbation envoyé', [
                'email' => $this->email,
                'activation_request_id' => $this->id
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur envoi email approbation', [
                'activation_request_id' => $this->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * 📧 Envoyer email de rejet
     */
    private function sendRejectionEmail(User $user, Feature $feature, User $admin): void
    {
        try {
            $subject = "Demande d'activation {$feature->name} - Informations complémentaires requises";

            $emailContent = "Bonjour {$this->full_name},

Nous accusons réception de votre demande d'activation pour la fonctionnalité {$feature->name} et vous remercions de l'intérêt que vous portez à nos services.

STATUT DE VOTRE DEMANDE
-----------------------------------------
Fonctionnalité demandée : {$feature->name}
Montant déclaré : {$this->amount_claimed}€
Date d'examen : " . now()->format('d/m/Y à H:i') . "
Traité par : {$admin->name}

OBSERVATIONS DE NOTRE ÉQUIPE
-----------------------------------------
{$this->admin_response}

ÉTAPES SUIVANTES
-----------------------------------------
Vous avez la possibilité de :
• Soumettre une nouvelle demande avec des justificatifs complémentaires
• Nous contacter pour obtenir des précisions sur les éléments requis
• Nous faire parvenir des informations supplémentaires en répondant à ce message

Nouvelle demande : " . config('app.frontend_url') . "/features

SUPPORT CLIENT
-----------------------------------------
Notre service client reste à votre entière disposition pour vous accompagner :

• Espace client : " . config('app.frontend_url') . "/dashboard
• Centre de support : " . config('app.frontend_url') . "/dashboard/tickets
• Email : Vous pouvez répondre directement à ce message

Nous vous remercions de votre compréhension et restons à votre disposition.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            Mail::raw($emailContent, function ($message) use ($subject) {
                $message->to($this->email)
                        ->subject($subject);
            });

            Log::info('📧 Email rejet envoyé', [
                'email' => $this->email,
                'activation_request_id' => $this->id
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur envoi email rejet', [
                'activation_request_id' => $this->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * 🔔 Créer notification pour l'utilisateur
     */
    private function createUserNotification(User $user, Feature $feature, string $decision): void
    {
        try {
            if ($decision === 'approved') {
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'feature_approved',
                    'priority' => 'high',
                    'status' => 'unread',
                    'title' => '🎉 Fonctionnalité activée !',
                    'message' => "Votre accès à {$feature->name} est maintenant actif et disponible immédiatement pour 30 jours !",
                    'data' => [
                        'activation_request_id' => $this->id,
                        'feature_id' => $feature->id,
                        'feature_name' => $feature->name,
                        'feature_key' => $feature->key,
                        'amount_paid' => $this->amount_claimed,
                        'approved_at' => now()->toDateTimeString(),
                    ],
                    'href' => "/features",
                    'category' => 'success',
                    'tags' => ['feature', 'approved', $feature->key, 'activation'],
                    'show_badge' => true,
                ]);
            } else {
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'feature_rejected',
                    'priority' => 'medium',
                    'status' => 'unread',
                    'title' => '❌ Demande d\'activation',
                    'message' => "Votre demande pour {$feature->name} nécessite des informations supplémentaires.",
                    'data' => [
                        'activation_request_id' => $this->id,
                        'feature_id' => $feature->id,
                        'feature_name' => $feature->name,
                        'rejection_reason' => $this->admin_response,
                        'rejected_at' => now()->toDateTimeString(),
                    ],
                    'href' => "/features",
                    'category' => 'warning',
                    'tags' => ['feature', 'rejected', $feature->key, 'resubmit'],
                    'show_badge' => true,
                ]);
            }

            Log::info('🔔 Notification utilisateur créée', [
                'user_id' => $user->id,
                'activation_request_id' => $this->id,
                'decision' => $decision
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur création notification', [
                'activation_request_id' => $this->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ Vérifier si c'est une réactivation de la fonctionnalité Réservation
     * et envoyer un email récapitulatif des réservations débloquées
     */
    private function checkAndSendReservationUnlockEmail(): void
    {
        try {
            // Vérifier si la fonctionnalité est bien "Réservation"
            $feature = $this->feature;
            $isReservationFeature = $feature->key === 'reservation' ||
                                   stripos($feature->name, 'réservation') !== false ||
                                   stripos($feature->name, 'reservation') !== false;

            if (!$isReservationFeature) {
                return; // Pas la fonctionnalité Réservation, on arrête ici
            }

            Log::info('🔍 Réactivation de fonctionnalité Réservation détectée', [
                'user_id' => $this->user_id,
                'feature_id' => $this->feature_id,
                'feature_name' => $feature->name
            ]);

            // Récupérer toutes les réservations bloquées pour cet utilisateur
            $blockedReservations = \App\Models\Reservation::where('user_id', $this->user_id)
                ->where('email_was_blocked', true)
                ->orderBy('created_at', 'desc')
                ->get();

            if ($blockedReservations->isEmpty()) {
                Log::info('ℹ️ Aucune réservation bloquée trouvée pour cet utilisateur', [
                    'user_id' => $this->user_id
                ]);
                return; // Aucune réservation bloquée, pas besoin d'email
            }

            Log::info('📊 Réservations bloquées trouvées', [
                'user_id' => $this->user_id,
                'count' => $blockedReservations->count()
            ]);

            // Envoyer l'email de résumé
            $user = $this->user;
            \Illuminate\Support\Facades\Mail::to($user->email)
                ->send(new \App\Mail\ReservationsUnlockedSummary($user, $blockedReservations));

            Log::info('✅ Email de résumé des réservations débloquées envoyé', [
                'user_id' => $this->user_id,
                'user_email' => $user->email,
                'reservations_count' => $blockedReservations->count()
            ]);

            // Marquer les réservations comme débloquées (plus besoin de renvoyer)
            $blockedReservations->each(function ($reservation) {
                $reservation->update(['email_was_blocked' => false]);
            });

            Log::info('✅ Réservations marquées comme débloquées', [
                'user_id' => $this->user_id,
                'count' => $blockedReservations->count()
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur lors de l\'envoi de l\'email de réservations débloquées', [
                'user_id' => $this->user_id,
                'activation_request_id' => $this->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // On ne bloque pas le processus d'approbation même si l'email échoue
        }
    }
}
