<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\ModerationController;

/**
 * Routes de modération du contenu
 * Préfixe : /api
 * Toutes les routes nécessitent une authentification
 */

Route::middleware('auth:sanctum')->group(function () {

    // ===== SIGNALEMENTS =====

    /**
     * POST /api/reports - Signaler un contenu
     * Body : { reportable_type: "blog_post|comment|social_media_post", reportable_id: 123, reason: "...", description: "..." }
     */
    Route::post('/reports', [ModerationController::class, 'reportContent'])->name('reports.create');

    /**
     * GET /api/reports - Récupérer les signalements de l'utilisateur
     */
    Route::get('/reports', [ModerationController::class, 'getUserReports'])->name('reports.index');

    // ===== BLOCAGE D'UTILISATEURS =====

    /**
     * POST /api/users/block - Bloquer un utilisateur
     * Body : { blocked_user_id: 123, reason: "..." }
     */
    Route::post('/users/block', [ModerationController::class, 'blockUser'])->name('users.block');

    /**
     * POST /api/users/{userId}/block - Bloquer un utilisateur (route alternative)
     */
    Route::post('/users/{userId}/block', [ModerationController::class, 'blockUserById'])->name('users.block.id');

    /**
     * POST /api/users/unblock - Débloquer un utilisateur
     * Body : { blocked_user_id: 123 }
     */
    Route::post('/users/unblock', [ModerationController::class, 'unblockUser'])->name('users.unblock');

    /**
     * GET /api/users/blocked - Liste des utilisateurs bloqués
     */
    Route::get('/users/blocked', [ModerationController::class, 'getBlockedUsers'])->name('users.blocked');

    // ===== MASQUAGE DE CONTENU =====

    /**
     * POST /api/content/hide - Masquer un contenu
     * Body : { hideable_type: "blog_post|comment|social_media_post", hideable_id: 123 }
     */
    Route::post('/content/hide', [ModerationController::class, 'hideContent'])->name('content.hide');

    /**
     * POST /api/content/unhide - Afficher un contenu masqué
     * Body : { hideable_type: "blog_post|comment|social_media_post", hideable_id: 123 }
     */
    Route::post('/content/unhide', [ModerationController::class, 'unhideContent'])->name('content.unhide');

    /**
     * GET /api/content/hidden - Liste des contenus masqués
     * Params : ?type=blog_post|comment|social_media_post
     */
    Route::get('/content/hidden', [ModerationController::class, 'getHiddenContents'])->name('content.hidden');

    // ===== PRÉFÉRENCES DE CONTENU =====

    /**
     * POST /api/content/preference - Définir une préférence (ça m'intéresse / pas)
     * Body : { preferable_type: "blog_post|social_media_post", preferable_id: 123, preference: "interested|not_interested" }
     */
    Route::post('/content/preference', [ModerationController::class, 'setContentPreference'])->name('content.preference.set');

    /**
     * DELETE /api/content/preference - Supprimer une préférence
     * Body : { preferable_type: "blog_post|social_media_post", preferable_id: 123 }
     */
    Route::delete('/content/preference', [ModerationController::class, 'removeContentPreference'])->name('content.preference.remove');

    /**
     * GET /api/content/preferences - Récupérer les préférences de l'utilisateur
     */
    Route::get('/content/preferences', [ModerationController::class, 'getUserPreferences'])->name('content.preferences');

});
