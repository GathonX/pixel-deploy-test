<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\SocialMediaController;

/**
 * Routes dédiées aux Social Media Posts
 * Préfixe : /api/social
 * Middleware : auth:sanctum (appliqué dans les contrôleurs)
 */

Route::prefix('social')->group(function () {

    // ===== ROUTES SPÉCIFIQUES (AVANT LES ROUTES AVEC {id}) =====

    /**
     * GET /api/social/platforms - Liste des plateformes supportées
     * Retourne : key, name, character_limit pour chaque plateforme
     */
    Route::get('/platforms', [SocialMediaController::class, 'platforms'])->name('social.platforms');

    /**
     * GET /api/social/statistics - Statistiques globales social media
     * Retourne : total, par plateforme, vues, likes, partages
     */
    Route::get('/statistics', [SocialMediaController::class, 'statistics'])->name('social.statistics');

    /**
     * GET /api/social/calendar - Posts pour calendrier
     */
    Route::get('/calendar', [SocialMediaController::class, 'calendar'])->name('social.calendar');

    /**
     * GET /api/social/platforms/{platform}/posts - Posts par plateforme
     * Paramètres : ?status=published&per_page=10
     */
    Route::get('/platforms/{platform}/posts', [SocialMediaController::class, 'postsByPlatform'])->name('social.by-platform');

    /**
     * GET /api/social/statistics/{platform} - Statistiques par plateforme
     * Retourne : stats spécifiques à une plateforme
     */
    Route::get('/statistics/{platform}', [SocialMediaController::class, 'platformStatistics'])->name('social.platform-statistics');

    // ===== ROUTES PRINCIPALES SOCIAL MEDIA =====

    /**
     * GET /api/social - Liste des posts social media de l'utilisateur
     * Paramètres : ?status=all|draft|scheduled|published&platform=facebook&per_page=10&page=1
     */
    Route::get('/', [SocialMediaController::class, 'index'])->name('social.index');

    /**
     * POST /api/social - Créer un nouveau post social media
     * Body : { platform, content, images?, video?, tags?, categories?, status? }
     */
    Route::post('/', [SocialMediaController::class, 'store'])->name('social.store');

    /**
     * POST /api/social/generate - Générer un post social media avec IA
     * Body : { platform, status?, scheduled_at?, categories?, tags? }
     */
    Route::post('/generate', [SocialMediaController::class, 'generate'])->name('social.generate');

    /**
     * GET /api/social/{id} - Détails d'un post social media
     * Auto-incrémente les vues
     */
    Route::get('/{id}', [SocialMediaController::class, 'show'])->name('social.show');

    /**
     * PUT /api/social/{id} - Mettre à jour un post social media
     * Body : { content?, images?, video?, tags?, categories? }
     */
    Route::put('/{id}', [SocialMediaController::class, 'update'])->name('social.update');

    /**
     * DELETE /api/social/{id} - Supprimer un post social media
     */
    Route::delete('/{id}', [SocialMediaController::class, 'destroy'])->name('social.destroy');

    // ===== ROUTES ACTIONS SPÉCIFIQUES =====

    /**
     * POST /api/social/{id}/status - Changer le statut d'un post social
     * Body : { status: "draft|scheduled|published", scheduled_at?, scheduled_time? }
     */
    Route::post('/{id}/status', [SocialMediaController::class, 'changeStatus'])->name('social.change-status');

    /**
     * POST /api/social/{id}/duplicate - Dupliquer un post social media
     * Crée une copie en mode draft
     */
    Route::post('/{id}/duplicate', [SocialMediaController::class, 'duplicate'])->name('social.duplicate');

    /**
     * POST /api/social/{id}/share - Comptabiliser un partage
     * Incrémente le compteur de partages (anti-spam intégré)
     */
    Route::post('/{id}/share', [SocialMediaController::class, 'share'])->name('social.share');

});

/**
 * Routes publiques social media (sans authentification)
 * Préfixe : /api/public/social
 * 🔧 CORRECTION : Routes spécifiques AVANT routes avec paramètres
 */
Route::prefix('public/social')->group(function () {

    /**
     * GET /api/public/social/trending - Posts social media tendance
     * 🔧 DÉPLACÉ EN PREMIER pour éviter conflit avec {platform}
     * Retourne les posts avec le plus d'engagement
     */
    Route::get('/trending', [SocialMediaController::class, 'trending'])->name('social.public.trending');

    /**
     * GET /api/public/social - Posts social media publics
     * Paramètres : ?platform=facebook&category=slug&per_page=10
     */
    Route::get('/', [SocialMediaController::class, 'publicIndex'])->name('social.public.index');

    /**
     * GET /api/public/social/{id} - Détail d'un post social public
     * 🔧 Route pour ID numérique spécifique
     */
    Route::get('/{id}', [SocialMediaController::class, 'publicShow'])
         ->where('id', '[0-9]+')
         ->name('social.public.show');

    /**
     * GET /api/public/social/{platform} - Posts publics par plateforme
     * 🔧 MAINTENANT EN DERNIER pour éviter capture incorrecte
     * Paramètres : ?per_page=10&page=1
     */
    Route::get('/{platform}', [SocialMediaController::class, 'publicByPlatform'])
         ->where('platform', 'facebook|instagram|twitter|linkedin')
         ->name('social.public.platform');

});
