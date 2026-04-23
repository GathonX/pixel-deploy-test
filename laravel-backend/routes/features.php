<?php

// laravel-backend/routes/features.php
// ✅ ROUTES COMPLÈTES POUR LE SYSTÈME DE FONCTIONNALITÉS + GÉNÉRATION + EXPIRATION

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserFeatureController;
use App\Http\Controllers\API\InvoiceController;

/*
|--------------------------------------------------------------------------
| Feature System Routes + Génération Automatique + Expiration
|--------------------------------------------------------------------------
|
| Routes pour le système de gestion des fonctionnalités avec génération
| automatique progressive de posts et système d'expiration mensuelle
| Préfixe automatique : /api/features/
| Middleware : auth:sanctum (appliqué dans api.php)
|
*/

// ===== 🎯 ROUTES UTILISATEUR FONCTIONNALITÉS =====

/**
 * Fonctionnalités disponibles pour l'utilisateur connecté
 * GET /api/features/available
 * Retourne les fonctionnalités que l'admin a validées pour cet utilisateur
 * ✅ NOUVEAU : Inclut informations d'expiration
 */
Route::get('/available', [UserFeatureController::class, 'getAvailableFeatures'])
     ->name('features.available');

/**
 * Toutes les fonctionnalités disponibles à l'achat
 * GET /api/features/available-for-purchase
 * Retourne toutes les fonctionnalités que l'utilisateur peut acheter
 */
Route::get('/available-for-purchase', [UserFeatureController::class, 'getAvailableForPurchase'])
     ->name('features.available-for-purchase');

/**
 * ✅ MODIFIÉ : Activer/Désactiver une fonctionnalité côté utilisateur
 * POST /api/features/toggle
 * Body: { feature_id: number, activate: boolean }
 * 🚀 NOUVEAU : Déclenche génération automatique si blog/social_media
 * 📅 NOUVEAU : Définit expiration à 30 jours lors de l'activation
 */
Route::post('/toggle', [UserFeatureController::class, 'toggleFeature'])
     ->name('features.toggle');


/**
 * ✅ SUPPRIMÉ : Plus de renouvellement automatique
 * Pour "renouveler", l'utilisateur doit faire un NOUVEL ACHAT
 * via /features/purchase/{id} dans le frontend
 * Chaque achat = nouveau UserFeatureAccess avec validation admin
 */

/**
 * Soumettre une demande d'activation avec preuves de paiement
 * POST /api/features/request-activation
 * Body: FormData avec fichiers de preuves
 */
Route::post('/request-activation', [UserFeatureController::class, 'submitActivationRequest'])
     ->name('features.request-activation');

/**
 * Historique des demandes d'activation de l'utilisateur
 * GET /api/features/request-history
 * Retourne toutes les demandes avec leur statut
 */
Route::get('/request-history', [UserFeatureController::class, 'getRequestHistory'])
     ->name('features.request-history');

/**
 * ✅ NOUVEAU : Historique complet des achats (tous les UserFeatureAccess)
 * GET /api/features/purchase-history
 * Retourne TOUS les achats de l'utilisateur (actifs, expirés, annulés)
 * Chaque achat est un enregistrement distinct avec son propre ID
 */
Route::get('/purchase-history', [UserFeatureController::class, 'getPurchaseHistory'])
     ->name('features.purchase-history');

/**
 * Page d'achat de fonctionnalité
 * GET /api/features/purchase/{id}
 * Retourne les détails de la fonctionnalité à acheter
 */
Route::get('/purchase/{id}', [UserFeatureController::class, 'getPurchaseDetails'])
    ->name('features.purchase');

// Routes pour la gestion des factures
Route::prefix('invoices')->group(function () {
    // Générer une facture avec une période de facturation spécifique
    Route::post('/generate-with-billing-period/{activationRequestId}', 
        [InvoiceController::class, 'generateInvoiceWithBillingPeriod'])
        ->name('features.invoices.generate-with-billing-period');

    // Mettre à jour la période de facturation d'une facture existante
    Route::patch('/{invoiceId}/update-billing-period', 
        [InvoiceController::class, 'updateInvoiceBillingPeriod'])
        ->name('features.invoices.update-billing-period');

    // Générer une facture directement depuis un featureId (pour nouvel achat)
    Route::post('/generate-for-feature/{featureId}', 
        [InvoiceController::class, 'generateInvoiceForFeature'])
        ->name('features.invoices.generate-for-feature');
    
    // Autres routes existantes...
    Route::post('/generate-with-instructions/{activationRequestId}', 
        [InvoiceController::class, 'generateInvoiceWithPaymentInstructions'])
        ->name('features.invoices.generate-with-instructions');

    Route::get('/{invoiceId}', 
        [InvoiceController::class, 'getInvoiceDetails'])
        ->name('features.invoices.details');

    // Télécharger une facture en PDF
    Route::get('/download/{invoiceId}', 
        [InvoiceController::class, 'downloadInvoicePDF'])
        ->name('features.invoices.download');

    // ... autres routes existantes
});

// ===== 🤖 ROUTES GÉNÉRATION AUTOMATIQUE PROGRESSIVE =====

/**
 * 🆕 NOUVEAU : Générer posts restants de manière progressive
 * POST /api/features/generate-remaining
 * Body: { feature_key: "blog|social_media" }
 *
 * 🎯 LOGIQUE PROGRESSIVE :
 * - Appelé automatiquement toutes les 3-4 minutes depuis le frontend
 * - Génère 1 seul post à la fois pour éviter surcharge
 * - Utilise le cache pour tracking des posts restants
 * - Reprend automatiquement après déconnexion/coupure
 */
Route::post('/generate-remaining', [UserFeatureController::class, 'generateRemainingPosts'])
     ->name('features.generate-remaining');

/**
 * 🆕 NOUVEAU : Vérifier le statut de génération progressive
 * GET /api/features/generation-status
 * Paramètres: ?feature_key=blog|social_media
 * Retourne: { has_remaining: boolean, posts_remaining: number, next_generation_time: datetime }
 */
Route::get('/generation-status', [UserFeatureController::class, 'getGenerationStatus'])
     ->name('features.generation-status');

/**
 * 🆕 NOUVEAU : Vérifier le statut du Job de génération immédiate (polling)
 * GET /api/features/immediate-job-status
 * Paramètres: ?job_id=xxx
 * Retourne: { status, progress, current_step, result }
 */
Route::get('/immediate-job-status', [UserFeatureController::class, 'getImmediateJobStatus'])
     ->name('features.immediate-job-status');

/**
 * 🆕 NOUVEAU : Déclencher génération progressive manuelle (pour debug)
 * POST /api/features/trigger-progressive
 * Body: { feature_key: "blog|social_media", force: boolean }
 * ⚠️ ADMIN SEULEMENT ou pour tests
 */
Route::post('/trigger-progressive', [UserFeatureController::class, 'triggerProgressiveGeneration'])
     ->name('features.trigger-progressive');


/**
 * ✅ NOUVEAU : Sauvegarder les plateformes sociales sélectionnées
 * POST /api/features/social-platforms
 * Body: { platforms: ['facebook', 'instagram', 'linkedin', 'twitter'] }
 */
Route::post('/social-platforms', [UserFeatureController::class, 'saveSocialPlatforms'])
     ->name('features.social-platforms.save');

/**
 * ✅ NOUVEAU : Récupérer les plateformes sociales activées
 * GET /api/features/social-platforms
 * Retourne: { platforms: [], all_platforms: [] }
 */
Route::get('/social-platforms', [UserFeatureController::class, 'getSocialPlatforms'])
     ->name('features.social-platforms.get');

/**
 * ✅ NOUVEAU : Toggle une plateforme sociale individuelle
 * POST /api/features/toggle-platform
 * Body: { platform: 'facebook|instagram|linkedin|twitter', activate: boolean }
 * Action: Active/Désactive la plateforme et génère des posts si activation
 */
Route::post('/toggle-platform', [UserFeatureController::class, 'togglePlatform'])
     ->name('features.toggle-platform');

/*
|--------------------------------------------------------------------------
| Notes d'implémentation - Système Complet avec Expiration
|--------------------------------------------------------------------------
|
| 🎯 PRINCIPE GÉNÉRATION :
| 1. Activation fonctionnalité → 1 post immédiat (post du jour)
| 2. Posts restants stockés en cache avec compteur
| 3. Frontend appelle /generate-remaining toutes les 10-15 minutes
| 4. Chaque appel génère 1 seul post supplémentaire
| 5. Système reprend automatiquement après déconnexion
| 6. Anti-duplication via seeds uniques et vérifications
|
| 📅 PRINCIPE EXPIRATION :
| 1. Activation fonctionnalité → expires_at = now() + 30 jours (ou 365 pour annuel)
| 2. Vérification automatique à chaque accès
| 3. Désactivation automatique si expiré
| 4. SUPPRIMÉ: Plus de renouvellement - nouvel achat obligatoire
| 5. Marquage automatique des fonctionnalités expirées
| 6. Chaque achat = nouveau UserFeatureAccess distinct
|
| 🔄 CYCLE HEBDOMADAIRE :
| - Lundi : 7 posts (lundi à dimanche)
| - Mardi : 6 posts (mardi à dimanche)
| - Mercredi : 5 posts (mercredi à dimanche)
| - etc...
|
| 💾 PERSISTENCE :
| - Cache Redis/Database pour état génération
| - Durée : 7 jours (jusqu'à dimanche)
| - Nettoyage automatique chaque lundi
| - expires_at en BDD pour l'expiration
|
| ⚡ PERFORMANCE :
| - 1 seul post par requête
| - Intervalle 10-15 minutes minimum
| - Pas de génération simultanée
| - Logs détaillés pour monitoring
| - Vérification expiration optimisée
|
| 🔐 SÉCURITÉ :
| - Middleware auth:sanctum sur toutes les routes
| - Vérification propriétaire pour chaque fonctionnalité
| - Validation expiration à chaque accès
| - Logs détaillés pour audit
|
*/
