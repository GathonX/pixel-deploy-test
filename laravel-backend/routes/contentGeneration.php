<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\ContentGenerationController;
use App\Http\Controllers\API\WeeklyPostGenerationController; // ✅ Utilisé pour generate-weekly MANUEL

/**
 * Routes de Monitoring et Configuration de Génération
 * Préfixe : /api/content-generation
 * ✅ ROUTES PROTÉGÉES avec authentification
 *
 * ℹ️ NOTE : La génération est maintenant dans /api/weekly-objectives/
 * Ces routes conservent uniquement monitoring et configuration
 */
Route::prefix('content-generation')->middleware('auth:sanctum')->group(function () {

    // ===== STATUT ET MONITORING =====

    /**
     * GET /api/content-generation/status
     * Obtenir statut génération en cours pour l'utilisateur
     * Retourne : { active_posts: number, last_generation: datetime, posts_this_week: number }
     */
    Route::get('/status', [ContentGenerationController::class, 'getGenerationStatus'])
         ->name('content-generation.status');

    /**
     * GET /api/content-generation/posts-this-week
     * Vérifier si utilisateur a posts cette semaine
     * Retourne : { has_posts: boolean, count: number, blog_posts: number, social_posts: number }
     */
    Route::get('/posts-this-week', [ContentGenerationController::class, 'getPostsThisWeek'])
         ->name('content-generation.posts-this-week');

    /**
     * GET /api/content-generation/history
     * Historique des générations pour l'utilisateur
     * Paramètres : ?page=1&per_page=10&type=blog|social_media
     * Retourne : { data: [...], pagination: {...} }
     */
    Route::get('/history', [ContentGenerationController::class, 'getGenerationHistory'])
         ->name('content-generation.history');

    /**
     * GET /api/content-generation/generation-history
     * Alias pour /history (compatibilité service frontend)
     * Retourne : { success: true, data: {...} }
     */
    Route::get('/generation-history', [ContentGenerationController::class, 'getGenerationHistory'])
         ->name('content-generation.generation-history');

    // ===== CONFIGURATION UTILISATEUR =====

    /**
     * GET /api/content-generation/settings
     * Récupérer paramètres génération de l'utilisateur
     * Retourne : { auto_generation_enabled: boolean, preferred_times: [...], platforms: [...] }
     */
    Route::get('/settings', [ContentGenerationController::class, 'getSettings'])
         ->name('content-generation.settings');

    /**
     * PUT /api/content-generation/settings
     * Modifier paramètres génération de l'utilisateur
     * Body : { auto_generation_enabled?: boolean, preferred_times?: [...], platforms?: [...] }
     * Retourne : { success: true, settings: {...} }
     */
    Route::put('/settings', [ContentGenerationController::class, 'updateSettings'])
         ->name('content-generation.update-settings');

    // ===== GÉNÉRATION DE POSTS =====

    // ✅ GARDE : Cette route est pour génération MANUELLE utilisateur (différent de l'automatique)
    /**
     * POST /api/content-generation/generate-weekly
     * Génération hebdomadaire MANUELLE (si utilisateur demande)
     * ⚠️ Différent de posts:generate-weekly qui est automatique
     * Retourne : { success: true, data: { blog_posts: [...], social_posts: [...] } }
     */
    Route::post('/generate-weekly', [WeeklyPostGenerationController::class, 'generateWeeklyPosts'])
         ->middleware('ai.plan')
         ->name('content-generation.generate-weekly');

    // ✅ SUPPRIMÉ : Duplication avec posts:generate-weekly --force automatique
    // La régénération est gérée automatiquement par le Kernel.php

    /**
     * POST /api/content-generation/generate-initial
     * Génération initiale pour nouveaux utilisateurs
     * Retourne : { success: true, data: { blog_posts: [...], social_posts: [...] } }
     */
    Route::post('/generate-initial', [WeeklyPostGenerationController::class, 'generateInitialPosts'])
         ->middleware('ai.plan')
         ->name('content-generation.generate-initial');

    /**
     * POST /api/content-generation/check-first-visit
     * Vérifier première visite et déclencher génération
     * Body: { page_type: "blog|social_media" }
     * Retourne : { success: true, data: {...} }
     */
    Route::post('/check-first-visit', [WeeklyPostGenerationController::class, 'checkFirstVisit'])
         ->middleware('ai.plan')
         ->name('content-generation.check-first-visit');

    /**
     * GET /api/content-generation/generation-status
     * Statut de génération pour une fonctionnalité
     * Paramètres : ?feature_key=blog|social_media
     * Retourne : { success: true, data: {...} }
     */
    Route::get('/generation-status', [WeeklyPostGenerationController::class, 'getGenerationStatus'])
         ->name('content-generation.generation-status');

});

/**
 * Routes administrateur pour monitoring système
 * Préfixe : /api/admin/content-generation
 * ✅ PROTÉGÉ avec middleware admin
 */
Route::prefix('admin/content-generation')->middleware(['auth:sanctum', 'admin'])->group(function () {

    /**
     * GET /api/admin/content-generation/global-status
     * Statut global du système de génération
     * Retourne : { active_users: number, total_posts: number, system_health: string }
     */
    Route::get('/global-status', [ContentGenerationController::class, 'getGlobalStatus'])
         ->name('admin.content-generation.global-status');

    /**
     * GET /api/admin/content-generation/users-with-features
     * Utilisateurs avec fonctionnalités actives
     * Retourne : { users: [...], total: number, features: [...] }
     */
    Route::get('/users-with-features', [ContentGenerationController::class, 'getUsersWithFeatures'])
         ->name('admin.content-generation.users-features');

});
