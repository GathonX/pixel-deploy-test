<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Feature;
use App\Models\UserFeatureAccess;
use App\Models\FeatureActivationRequest;
use App\Models\User;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AdminFeatureController extends Controller
{
    /**
     * Liste des fonctionnalités avec stats
     */
    public function index(): JsonResponse
    {
        $features = Feature::with(['userAccess', 'activationRequests'])
            ->get()
            ->map(function ($feature) {
                return [
                    'id' => $feature->id,
                    'key' => $feature->key,
                    'name' => $feature->name,
                    'price' => $feature->price,
                    'category' => $feature->category,
                    'is_active' => $feature->is_active,
                    'users_with_access' => $feature->userAccess->where('admin_enabled', true)->count(),
                    'pending_requests' => $feature->activationRequests->where('status', 'pending')->count(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $features
        ]);
    }

    /**
     * Utilisateurs avec accès à une fonctionnalité
     */
    public function getUsersWithAccess(int $featureId): JsonResponse
    {
        $accesses = UserFeatureAccess::where('feature_id', $featureId)
            ->with(['user', 'feature', 'adminEnabledBy'])
            ->get()
            ->map(function ($access) {
                return [
                    'id' => $access->id,
                    'user_name' => $access->user->name,
                    'user_email' => $access->user->email,
                    'admin_enabled' => $access->admin_enabled,
                    'user_activated' => $access->user_activated,
                    'amount_paid' => $access->amount_paid,
                    'payment_method' => $access->payment_method,
                    'admin_enabled_at' => $access->admin_enabled_at,
                    'admin_enabled_by' => $access->adminEnabledBy?->name,
                    'status' => $access->status,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $accesses
        ]);
    }

    /**
     * Activer l'accès pour un utilisateur (avec notifications optionnelles)
     */
    public function enableUserAccess(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'feature_id' => 'required|exists:features,id',
            'amount_paid' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'admin_notes' => 'nullable|string',
            'send_notifications' => 'boolean',
            'billing_period' => 'nullable|in:monthly,yearly',
            'original_price' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            // ✅ VALIDATION : Vérifier qu'il n'y a pas déjà un accès ACTIF (SOURCE DE VÉRITÉ = expires_at)
            $activeAccess = UserFeatureAccess::where('user_id', $request->user_id)
                ->where('feature_id', $request->feature_id)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->orderBy('expires_at', 'desc')
                ->first();

            if ($activeAccess) {
                $daysRemaining = $activeAccess->getDaysRemaining();

                Log::warning("⚠️ Tentative d'activation alors qu'un accès actif existe", [
                    'user_id' => $request->user_id,
                    'feature_id' => $request->feature_id,
                    'existing_access_id' => $activeAccess->id,
                    'days_remaining' => $daysRemaining
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Cet utilisateur a déjà un accès actif à cette fonctionnalité ({$daysRemaining} jours restants). Attendez l'expiration ou révoque z l'ancien accès d'abord.",
                    'existing_access' => [
                        'id' => $activeAccess->id,
                        'expires_at' => $activeAccess->expires_at?->toISOString(),
                        'days_remaining' => $daysRemaining
                    ]
                ], 409);
            }

            // Calculer la durée selon la période de facturation
            $billingPeriod = $request->billing_period ?? 'monthly';
            $days = $billingPeriod === 'yearly' ? 365 : 30;

            // ✅ Créer un NOUVEL accès (pas updateOrCreate)
            // Note : Si on arrive ici, c'est qu'il n'y a PAS d'accès actif (validation passée)
            $access = UserFeatureAccess::create([
                'user_id' => $request->user_id,
                'feature_id' => $request->feature_id,
                'admin_enabled' => true,
                'user_activated' => false, // ✅ L'utilisateur doit activer manuellement
                'admin_enabled_at' => now(),
                'expires_at' => now()->addDays($days), // ✅ Selon la période (30j ou 365j)
                'admin_enabled_by' => auth()->id(),
                'amount_paid' => $request->amount_paid,
                'payment_method' => $request->payment_method,
                'admin_notes' => $request->admin_notes,
                'status' => 'active',
                'billing_period' => $billingPeriod,
                'original_price' => $request->original_price,
                'discount_percentage' => $request->discount_percentage ?? 0,
            ]);

            // ✅ Si demandé, envoyer les notifications comme pour l'approbation
            if ($request->boolean('send_notifications', false)) {
                $this->sendManualActivationNotifications(
                    $request->user_id,
                    $request->feature_id,
                    $request->amount_paid,
                    $request->payment_method,
                    $request->admin_notes
                );
            }

            Log::info('✅ Accès utilisateur activé manuellement', [
                'user_id' => $request->user_id,
                'feature_id' => $request->feature_id,
                'admin_id' => auth()->id(),
                'admin_name' => auth()->user()->name,
                'notifications_sent' => $request->boolean('send_notifications', false),
                'amount_paid' => $request->amount_paid
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Accès activé avec succès',
                'data' => [
                    'access' => $access,
                    'notifications_sent' => $request->boolean('send_notifications', false),
                    'user_notified' => $request->boolean('send_notifications', false),
                    'ticket_updated' => $request->boolean('send_notifications', false),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur activation manuelle accès utilisateur', [
                'user_id' => $request->user_id,
                'feature_id' => $request->feature_id,
                'admin_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'activation de l\'accès'
            ], 500);
        }
    }

    /**
     * ✅ Envoyer les notifications pour une activation manuelle
     */
    private function sendManualActivationNotifications(
        int $userId,
        int $featureId,
        float $amountPaid,
        string $paymentMethod,
        ?string $adminNotes
    ): void {
        try {
            $admin = auth()->user();
            $user = User::findOrFail($userId);
            $feature = Feature::findOrFail($featureId);

            // 1️⃣ Créer notification pour l'utilisateur
            Notification::create([
                'user_id' => $user->id,
                'type' => 'feature_manual_activation',
                'priority' => 'high',
                'status' => 'unread',
                'title' => '🎉 Fonctionnalité activée !',
                'message' => "Votre accès à {$feature->name} a été activé par notre équipe et est maintenant disponible pour 30 jours !",
                'data' => [
                    'feature_id' => $feature->id,
                    'feature_name' => $feature->name,
                    'feature_key' => $feature->key,
                    'amount_paid' => $amountPaid,
                    'payment_method' => $paymentMethod,
                    'activated_by' => $admin->name,
                    'activated_at' => now()->toDateTimeString(),
                    'expires_at' => now()->addDays(30)->toDateTimeString(),
                ],
                'href' => "/features",
                'category' => 'success',
                'tags' => ['feature', 'manual_activation', $feature->key],
                'show_badge' => true,
            ]);

            // 2️⃣ Envoyer email de félicitations
            $this->sendManualActivationEmail($user, $feature, $admin, $amountPaid, $paymentMethod, $adminNotes);

            // 3️⃣ Chercher et répondre à un ticket si il existe
            $this->createManualActivationTicketResponse($user, $feature, $admin, $adminNotes);

            Log::info('✅ Notifications activation manuelle envoyées', [
                'user_id' => $userId,
                'feature_id' => $featureId,
                'admin_id' => $admin->id
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur envoi notifications activation manuelle', [
                'user_id' => $userId,
                'feature_id' => $featureId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Mettre à jour l'accès d'un utilisateur (admin_enabled, status, etc.)
     */
    public function updateUserAccess(Request $request, int $accessId): JsonResponse
    {
        $request->validate([
            'admin_enabled' => 'sometimes|boolean',
            'user_activated' => 'sometimes|boolean',
            'status' => 'sometimes|in:active,inactive,suspended,expired',
            'amount_paid' => 'sometimes|numeric|min:0',
            'payment_method' => 'sometimes|string',
            'admin_notes' => 'sometimes|nullable|string',
        ]);

        try {
            $access = UserFeatureAccess::findOrFail($accessId);

            // Préparer les données de mise à jour
            $updateData = [];

            if ($request->has('admin_enabled')) {
                $updateData['admin_enabled'] = $request->admin_enabled;

                // Si on active, mettre aussi le timestamp et l'admin
                if ($request->admin_enabled) {
                    $updateData['admin_enabled_at'] = now();
                    $updateData['admin_enabled_by_id'] = auth()->id();
                }
            }

            if ($request->has('user_activated')) {
                $updateData['user_activated'] = $request->user_activated;
            }

            if ($request->has('status')) {
                $updateData['status'] = $request->status;
            }

            if ($request->has('amount_paid')) {
                $updateData['amount_paid'] = $request->amount_paid;
            }

            if ($request->has('payment_method')) {
                $updateData['payment_method'] = $request->payment_method;
            }

            if ($request->has('admin_notes')) {
                $updateData['admin_notes'] = $request->admin_notes;
            }

            // Mettre à jour l'accès
            $access->update($updateData);

            Log::info('✅ Accès mis à jour', [
                'access_id' => $accessId,
                'user_id' => $access->user_id,
                'feature_id' => $access->feature_id,
                'updated_fields' => array_keys($updateData),
                'admin_id' => auth()->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Accès mis à jour avec succès',
                'data' => $access->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur mise à jour accès', [
                'access_id' => $accessId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'accès'
            ], 500);
        }
    }

    /**
     * Révoquer l'accès d'un utilisateur
     */
    public function revokeUserAccess(int $accessId): JsonResponse
    {
        $access = UserFeatureAccess::findOrFail($accessId);

        $access->update([
            'admin_enabled' => false,
            'user_activated' => false,
            'status' => 'suspended',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Accès révoqué avec succès'
        ]);
    }

    /**
     * Demandes d'activation en attente
     */
    public function getPendingRequests(): JsonResponse
    {
        $requests = FeatureActivationRequest::with(['user', 'feature'])
            ->pending()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($request) {
                return [
                    'id' => $request->id,
                    'user_name' => $request->user->name,
                    'user_email' => $request->user->email,
                    'feature_name' => $request->feature->name,
                    'amount_claimed' => $request->amount_claimed,
                    'payment_method' => $request->payment_method,
                    'payment_proofs' => $request->payment_proofs,
                    'user_message' => $request->user_message,
                    'created_at' => $request->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    /**
     * Approuver une demande d'activation (VERSION AMÉLIORÉE)
     */
    public function approveRequest(Request $request, int $requestId): JsonResponse
    {
        $request->validate([
            'admin_response' => 'nullable|string|max:1000',
        ]);

        try {
            $activationRequest = FeatureActivationRequest::findOrFail($requestId);
            
            // Message par défaut professionnel si aucun message personnalisé
            $adminResponse = $request->admin_response ?: 
                "Félicitations ! Votre demande a été validée par notre équipe. " .
                "Vous pouvez maintenant profiter pleinement de cette fonctionnalité.";
            
            $activationRequest->approve(auth()->id(), $adminResponse);

            Log::info('✅ Demande d\'activation approuvée', [
                'activation_request_id' => $requestId,
                'feature_name' => $activationRequest->feature->name,
                'admin_id' => auth()->id(),
                'admin_name' => auth()->user()->name,
                'has_custom_message' => !empty($request->admin_response)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Demande approuvée et accès activé',
                'data' => [
                    'feature_name' => $activationRequest->feature->name,
                    'user_name' => $activationRequest->user->name,
                    'automatic_response_sent' => true,
                    'ticket_updated' => true
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur approbation demande', [
                'activation_request_id' => $requestId,
                'admin_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'approbation de la demande'
            ], 500);
        }
    }

    /**
     * Rejeter une demande d'activation (VERSION AMÉLIORÉE)
     */
    public function rejectRequest(Request $request, int $requestId): JsonResponse
    {
        $request->validate([
            'admin_response' => 'required|string|max:1000',
        ]);

        try {
            $activationRequest = FeatureActivationRequest::findOrFail($requestId);
            $activationRequest->reject(auth()->id(), $request->admin_response);

            Log::info('✅ Demande d\'activation rejetée', [
                'activation_request_id' => $requestId,
                'feature_name' => $activationRequest->feature->name,
                'admin_id' => auth()->id(),
                'admin_name' => auth()->user()->name,
                'rejection_reason' => $request->admin_response
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Demande rejetée et utilisateur notifié',
                'data' => [
                    'feature_name' => $activationRequest->feature->name,
                    'user_name' => $activationRequest->user->name,
                    'automatic_response_sent' => true,
                    'ticket_updated' => true,
                    'reason' => $request->admin_response
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur rejet demande', [
                'activation_request_id' => $requestId,
                'admin_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du rejet de la demande'
            ], 500);
        }
    }

    /**
     * ✅ Envoyer email d'activation manuelle
     */
    private function sendManualActivationEmail(
        User $user,
        Feature $feature,
        User $admin,
        float $amountPaid,
        string $paymentMethod,
        ?string $adminNotes
    ): void {
        try {
            $subject = "Accès activé - {$feature->name}";

            $emailContent = "Bonjour {$user->name},

Nous avons le plaisir de vous informer que votre accès à la fonctionnalité {$feature->name} a été activé par notre équipe !

DÉTAILS DE L'ACTIVATION
-----------------------------------------
Fonctionnalité : {$feature->name}
Montant : {$amountPaid}€
Méthode de paiement : {$paymentMethod}
Activé par : {$admin->name}
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
" . ($adminNotes ?: 'Nous vous remercions de votre confiance et vous souhaitons une excellente utilisation de cette fonctionnalité.') . "

LIENS UTILES
-----------------------------------------
• Tableau de bord : " . config('app.frontend_url') . "/dashboard
• Mes fonctionnalités : " . config('app.frontend_url') . "/features
• Support technique : " . config('app.frontend_url') . "/dashboard/tickets

Nous restons à votre disposition pour toute question.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            Mail::raw($emailContent, function ($message) use ($subject, $user) {
                $message->to($user->email)
                        ->subject($subject);
            });

            Log::info('📧 Email activation manuelle envoyé', [
                'email' => $user->email,
                'feature_name' => $feature->name,
                'user_id' => $user->id
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur envoi email activation manuelle', [
                'user_id' => $user->id,
                'feature_id' => $feature->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ Créer réponse au ticket pour activation manuelle
     */
    private function createManualActivationTicketResponse(
        User $user,
        Feature $feature,
        User $admin,
        ?string $adminNotes
    ): void {
        try {
            // Chercher un ticket ouvert récent lié à cette fonctionnalité
            $ticket = Ticket::where('user_id', $user->id)
                ->where('category', 'payment')
                ->where(function($query) use ($feature) {
                    $query->where('title', 'like', '%' . $feature->name . '%')
                          ->orWhere('description', 'like', '%' . $feature->name . '%');
                })
                ->whereIn('status', ['open', 'pending'])
                ->orderBy('created_at', 'desc')
                ->first();

            if ($ticket) {
                $adminMessage = "🎉 **Excellente nouvelle !** Votre accès à **{$feature->name}** a été activé par notre équipe.\n\n";
                $adminMessage .= "✅ **Statut** : Fonctionnalité activée et disponible immédiatement\n";
                $adminMessage .= "📅 **Date d'activation** : " . now()->format('d/m/Y à H:i') . "\n";
                $adminMessage .= "⏰ **Expire le** : " . now()->addDays(30)->format('d/m/Y à H:i') . " (30 jours)\n";
                $adminMessage .= "👤 **Activé par** : {$admin->name}\n\n";

                $adminMessage .= "**🚀 Votre fonctionnalité est maintenant active :**\n";
                $adminMessage .= "✨ Accédez immédiatement à **{$feature->name}** dans votre dashboard\n";
                $adminMessage .= "🎯 Profitez de toutes les fonctionnalités pendant 30 jours\n";
                $adminMessage .= "📊 Consultez votre tableau de bord pour commencer\n\n";

                if ($adminNotes) {
                    $adminMessage .= "**💬 Message personnalisé de notre équipe :**\n";
                    $adminMessage .= "_{$adminNotes}_\n\n";
                }

                $adminMessage .= "Nous vous remercions pour votre confiance et vous souhaitons une excellente expérience !\n\n";
                $adminMessage .= "**L'équipe PixelRise** 🌟";

                // Créer la réponse admin
                TicketMessage::create([
                    'ticket_id' => $ticket->id,
                    'sender' => 'admin',
                    'text' => $adminMessage,
                ]);

                // Fermer le ticket avec succès
                $ticket->update([
                    'status' => 'resolved',
                    'resolved_at' => now(),
                    'first_response_at' => $ticket->first_response_at ?: now()
                ]);

                Log::info('🎫 Réponse admin créée pour activation manuelle', [
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                    'feature_id' => $feature->id,
                    'admin_id' => $admin->id
                ]);
            } else {
                Log::info('ℹ️ Aucun ticket trouvé pour l\'activation manuelle', [
                    'user_id' => $user->id,
                    'feature_name' => $feature->name
                ]);
            }

        } catch (\Exception $e) {
            Log::error('❌ Erreur création réponse ticket activation manuelle', [
                'user_id' => $user->id,
                'feature_id' => $feature->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ NOUVEAU : Supprimer définitivement un ancien achat (UserFeatureAccess)
     * Supprime cascade tous les posts/sprints liés grâce à onDelete('cascade')
     *
     * DELETE /api/admin/user-feature-access/{id}
     */
    public function deletePurchase(int $accessId): JsonResponse
    {
        try {
            $access = UserFeatureAccess::with(['user', 'feature'])->find($accessId);

            if (!$access) {
                return response()->json([
                    'success' => false,
                    'message' => 'Achat introuvable'
                ], 404);
            }

            // ✅ Compter les données qui seront supprimées (cascade)
            $blogPostsCount = \App\Models\BlogPost::where('user_feature_access_id', $accessId)->count();
            $socialPostsCount = \App\Models\SocialMediaPost::where('user_feature_access_id', $accessId)->count();
            $sprintsCount = \App\Models\Sprint::where('user_feature_access_id', $accessId)->count();

            Log::info("🗑️ [ADMIN] Suppression purchase", [
                'access_id' => $accessId,
                'user_id' => $access->user_id,
                'feature_key' => $access->feature->key,
                'blog_posts_to_delete' => $blogPostsCount,
                'social_posts_to_delete' => $socialPostsCount,
                'sprints_to_delete' => $sprintsCount
            ]);

            // ✅ Supprimer l'access (cascade delete s'applique automatiquement)
            $access->delete();

            Log::info("✅ [ADMIN] Purchase supprimé avec succès", [
                'access_id' => $accessId,
                'deleted_blog_posts' => $blogPostsCount,
                'deleted_social_posts' => $socialPostsCount,
                'deleted_sprints' => $sprintsCount
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Achat supprimé définitivement',
                'data' => [
                    'access_id' => $accessId,
                    'deleted_counts' => [
                        'blog_posts' => $blogPostsCount,
                        'social_posts' => $socialPostsCount,
                        'sprints' => $sprintsCount
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ [ADMIN] Erreur suppression purchase", [
                'access_id' => $accessId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'achat',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
