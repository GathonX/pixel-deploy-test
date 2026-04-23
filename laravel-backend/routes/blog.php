<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\BlogController;

/**
 * Routes dédiées aux Blog Posts
 * Préfixe : /api/blog
 * ✅ CORRECTION : Routes principales PROTÉGÉES avec authentification
 */
Route::prefix('blog')->group(function () {

    // ===== ROUTES SPÉCIFIQUES - PROTÉGÉES =====

    /**
     * GET /api/blog/statistics - Statistiques des blog posts de l'utilisateur (PROTÉGÉ)
     * Retourne : total, published, drafts, vues, likes de l'utilisateur connecté
     * ✅ AVEC AUTHENTIFICATION - Statistiques personnelles
     */
    Route::get('/statistics', [BlogController::class, 'statistics'])
         ->middleware('auth:sanctum')
         ->name('blog.statistics');

    /**
     * ✅ CORRECTION CRITIQUE : DÉPLACER AVANT /{id}
     * GET /api/blog/calendar - Posts blog pour calendrier (PROTÉGÉ)
     * Paramètres : ?year=2025&month=8&status=all
     * Retourne : Tous les posts (draft, scheduled, published) de l'utilisateur
     * ✅ AVEC AUTHENTIFICATION - Posts personnels uniquement
     */
    Route::get('/calendar', [BlogController::class, 'calendar'])
         ->middleware('auth:sanctum')
         ->name('blog.calendar');

    /**
     * POST /api/blog/upload-image - Upload d'image pour blog (PROTÉGÉ)
     * Body : FormData avec 'image'
     * Retourne : { success: true, data: { path: "blog-images/filename.jpg" } }
     * ✅ AVEC AUTHENTIFICATION - Nécessite utilisateur connecté
     */
    Route::post('/upload-image', [BlogController::class, 'uploadImage'])
         ->middleware('auth:sanctum')
         ->name('blog.upload-image');

    // ===== ROUTES PRINCIPALES BLOG POSTS - PROTÉGÉES =====

    /**
     * GET /api/blog - Liste des blog posts de l'utilisateur (PROTÉGÉ)
     * Paramètres : ?status=all|draft|scheduled|published&category=slug&per_page=10&page=1
     * ✅ AVEC AUTHENTIFICATION - Posts personnels uniquement
     */
    Route::get('/', [BlogController::class, 'index'])
         ->middleware('auth:sanctum')
         ->name('blog.index');

    /**
     * POST /api/blog - Créer un nouveau blog post (PROTÉGÉ)
     * Body : { title, summary, content, header_image?, categories?, tags?, status? }
     * ✅ AVEC AUTHENTIFICATION - Création pour utilisateur connecté
     */
    Route::post('/', [BlogController::class, 'store'])
         ->middleware('auth:sanctum')
         ->name('blog.store');

    /**
     * ✅ CORRECTION : DÉPLACÉ APRÈS /calendar
     * GET /api/blog/{id} - Détails d'un blog post (PROTÉGÉ)
     * Auto-incrémente les vues
     * ✅ AVEC AUTHENTIFICATION - Accès seulement si propriétaire
     */
    Route::get('/{id}', [BlogController::class, 'show'])
         ->middleware('auth:sanctum')
         ->name('blog.show');

    /**
     * PUT /api/blog/{id} - Mettre à jour un blog post (PROTÉGÉ)
     * Body : { title?, summary?, content?, header_image?, categories?, tags?, status? }
     * ✅ AVEC AUTHENTIFICATION - Modification seulement si propriétaire
     */
    Route::put('/{id}', [BlogController::class, 'update'])
         ->middleware('auth:sanctum')
         ->name('blog.update');

    /**
     * DELETE /api/blog/{id} - Supprimer un blog post (PROTÉGÉ)
     * ✅ AVEC AUTHENTIFICATION - Suppression seulement si propriétaire
     */
    Route::delete('/{id}', [BlogController::class, 'destroy'])
         ->middleware('auth:sanctum')
         ->name('blog.destroy');

    // ===== ROUTES ACTIONS SPÉCIFIQUES - PROTÉGÉES =====

    /**
     * POST /api/blog/{id}/status - Changer le statut d'un blog post (PROTÉGÉ)
     * Body : { status: "draft|scheduled|published", scheduled_at?, scheduled_time? }
     * ✅ AVEC AUTHENTIFICATION
     */
    Route::post('/{id}/status', [BlogController::class, 'changeStatus'])
         ->middleware('auth:sanctum')
         ->name('blog.change-status');

    /**
     * POST /api/blog/{id}/duplicate - Dupliquer un blog post (PROTÉGÉ)
     * Crée une copie en mode draft
     * ✅ AVEC AUTHENTIFICATION
     */
    Route::post('/{id}/duplicate', [BlogController::class, 'duplicate'])
         ->middleware('auth:sanctum')
         ->name('blog.duplicate');

    /**
     * POST /api/blog/{id}/share - Comptabiliser un partage (PROTÉGÉ)
     * Incrémente le compteur de partages (anti-spam intégré)
     * ✅ AVEC AUTHENTIFICATION
     */
    Route::post('/{id}/share', [BlogController::class, 'share'])
         ->middleware('auth:sanctum')
         ->name('blog.share');

});

/**
 * Routes publiques blog (sans authentification)
 * Préfixe : /api/public/blog
 * ✅ ROUTES PUBLIQUES - Lecture seule pour visiteurs
 * ✅ RATE LIMIT : 1000 req/min, 10000 req/h (très permissif pour page publique)
 */
Route::prefix('public/blog')->middleware('throttle:public-blog')->group(function () {

    /**
     * GET /api/public/blog - Blog posts publics (PUBLIC)
     * Paramètres : ?category=slug&per_page=10&author=user_id&featured=true
     * Retourne : Posts publiés uniquement avec données publiques
     * ✅ SANS AUTHENTIFICATION - Accessible à tous
     */
    Route::get('/', [BlogController::class, 'publicIndex'])->name('blog.public.index');

    /**
     * GET /api/public/blog/{slug} - Article de blog par slug (PUBLIC)
     * Auto-incrémente les vues publiques
     * Retourne : Article complet avec auteur, catégories, tags
     * ✅ SANS AUTHENTIFICATION - Lecture publique
     */
    Route::get('/{slug}', [BlogController::class, 'publicShow'])->name('blog.public.show');

    /**
     * GET /api/public/blog/trending - Articles tendance (PUBLIC)
     * Retourne : Articles avec le plus d'engagement récent
     * ✅ SANS AUTHENTIFICATION
     */
    Route::get('/trending', [BlogController::class, 'trending'])->name('blog.public.trending');

    /**
     * GET /api/public/blog/featured - Articles mis en avant (PUBLIC)
     * Retourne : Articles sélectionnés par les administrateurs
     * ✅ SANS AUTHENTIFICATION
     */
    Route::get('/featured', [BlogController::class, 'featured'])->name('blog.public.featured');

    /**
     * GET /api/public/blog/category/{slug} - Articles par catégorie (PUBLIC)
     * Paramètres : ?per_page=10&page=1
     * ✅ SANS AUTHENTIFICATION
     */
    Route::get('/category/{slug}', [BlogController::class, 'publicByCategory'])->name('blog.public.category');

    /**
     * GET /api/public/blog/author/{id} - Articles par auteur (PUBLIC)
     * Paramètres : ?per_page=10&page=1
     * ✅ SANS AUTHENTIFICATION
     */
    Route::get('/author/{id}', [BlogController::class, 'publicByAuthor'])->name('blog.public.author');

});
