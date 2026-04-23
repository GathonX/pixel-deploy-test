<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\InteractionController;

/**
 * Routes dédiées aux Interactions (likes, commentaires, vues, partages)
 * Préfixe : /api/interactions
 * ✅ CORRECTION : Routes principales PUBLIQUES (sans authentification)
 */

Route::prefix('interactions')->group(function () {
    
    // ===== ROUTES STATISTIQUES - PUBLIQUES =====
    
    /**
     * GET /api/interactions/{type}/{id}/statistics - Stats d'interaction d'un post (PUBLIC)
     * Retourne : views, likes, comments, reactions_by_type, shares
     * ✅ SANS AUTHENTIFICATION - Statistiques publiques
     */
    Route::get('/{type}/{id}/statistics', [InteractionController::class, 'getStatistics'])->name('interactions.statistics');

    /**
     * POST /api/interactions/batch-statistics - Stats batch (PUBLIC)
     * Body: { posts: [{type: "blog_post", id: 1}, ...] }
     */
    Route::post('/batch-statistics', [InteractionController::class, 'batchStatistics'])->name('interactions.batch-statistics');

    // ===== ROUTES COMMENTAIRES - PUBLIQUES =====
    
    /**
     * GET /api/interactions/comments/{commentableType}/{commentableId} - Liste des commentaires (PUBLIC)
     * Paramètres : ?page=1&per_page=10
     * Retourne : commentaires principaux + réponses hiérarchiques
     * ✅ SANS AUTHENTIFICATION - Lecture des commentaires publique
     */
    Route::get('/comments/{commentableType}/{commentableId}', [InteractionController::class, 'getComments'])->name('interactions.comments');
    
    // ===== ROUTES VUES - PUBLIQUES =====

    /**
     * POST /api/interactions/view - Incrémenter les vues d'un post (PUBLIC)
     * Body : { post_type: "blog|social", post_id: 123 }
     * Anti-spam : 1 vue par utilisateur par heure
     * ✅ SANS AUTHENTIFICATION - Comptage des vues public
     */
    Route::post('/view', [InteractionController::class, 'incrementView'])->middleware('embed.cors')->name('interactions.view');
    
    // ===== ✅ NOUVEAUX ENDPOINTS PUBLICS POUR EMBED =====

    /**
     * POST /api/interactions/embed/like - Like public pour embed (NOUVEAU)
     * Body : { post_type: "blog|social", post_id: 123, client_id: "xxx" }
     * ✅ SANS AUTHENTIFICATION - Like anonyme pour visiteurs sites clients
     */
    Route::post('/embed/like', [InteractionController::class, 'embedLike'])->middleware('embed.cors')->name('interactions.embed.like');

    /**
     * POST /api/interactions/embed/share - Partage public pour embed (NOUVEAU)
     * Body : { post_type: "blog|social", post_id: 123, client_id: "xxx" }
     * ✅ SANS AUTHENTIFICATION - Partage anonyme pour visiteurs sites clients
     */
    Route::post('/embed/share', [InteractionController::class, 'embedShare'])->middleware('embed.cors')->name('interactions.embed.share');

    /**
     * POST /api/interactions/embed/comment - Commentaire public pour embed
     */
    Route::post('/embed/comment', [InteractionController::class, 'embedComment'])->middleware('embed.cors')->name('interactions.embed.comment');

    /**
 * POST /api/interactions/embed/comment-like - Like public sur commentaire pour embed
 */
Route::post('/embed/comment-like', [InteractionController::class, 'embedCommentLike'])->middleware('embed.cors')->name('interactions.embed.comment-like');

    // ===== ROUTES PROTÉGÉES (AVEC AUTHENTIFICATION) =====
    
    Route::middleware('auth:sanctum')->group(function () {
        
        // ===== ROUTES RÉACTIONS =====
        
        /**
         * POST /api/interactions/reaction - Toggle réaction (like, love, angry, etc.)
         * Body : { 
         *   reactable_type: "blog_post|social_media_post|comment", 
         *   reactable_id: 123, 
         *   type?: "like|love|laugh|angry|sad" 
         * }
         */
        Route::post('/reaction', [InteractionController::class, 'toggleReaction'])->name('interactions.reaction');
        
        /**
         * GET /api/interactions/user-reactions/{type}/{id} - Réactions de l'utilisateur
         * Retourne : user_reactions[], has_liked, has_loved
         */
        Route::get('/user-reactions/{type}/{id}', [InteractionController::class, 'getUserReactions'])->name('interactions.user-reactions');
        
        // ===== ROUTES COMMENTAIRES PROTÉGÉES =====
        
        /**
         * POST /api/interactions/comment - Créer un commentaire ou réponse
         * Body : {
         *   commentable_type: "blog_post|social_media_post",
         *   commentable_id: 123,
         *   content: "...",
         *   parent_id?: 456
         * }
         */
        Route::post('/comment', [InteractionController::class, 'createComment'])->name('interactions.comment');

        /**
         * PUT /api/interactions/comments/{commentId} - Modifier un commentaire
         * Body : { content: "..." }
         */
        Route::put('/comments/{commentId}', [InteractionController::class, 'updateComment'])->name('interactions.comment.update');

        /**
         * DELETE /api/interactions/comments/{commentId} - Supprimer un commentaire
         */
        Route::delete('/comments/{commentId}', [InteractionController::class, 'deleteComment'])->name('interactions.comment.delete');

        /**
         * POST /api/interactions/comments/{commentId}/hide - Masquer un commentaire
         */
        Route::post('/comments/{commentId}/hide', [InteractionController::class, 'hideComment'])->name('interactions.comment.hide');

        /**
         * POST /api/interactions/comments/{commentId}/unhide - Démasquer un commentaire
         */
        Route::post('/comments/{commentId}/unhide', [InteractionController::class, 'unhideComment'])->name('interactions.comment.unhide');

        /**
         * POST /api/interactions/comments/{commentId}/report - Signaler un commentaire
         * Body : { reason: "..." }
         */
        Route::post('/comments/{commentId}/report', [InteractionController::class, 'reportComment'])->name('interactions.comment.report');

        /**
         * POST /api/interactions/share - Enregistrer un partage
         */
        Route::post('/share', [InteractionController::class, 'recordShare'])->name('interactions.share');

    });
    
});

/**
 * Routes interactions publiques (lecture seule, sans auth)
 * Préfixe : /api/public/interactions
 * ✅ CONSERVÉ - Routes publiques alternatives avec préfixe explicite
 */
Route::prefix('public/interactions')->group(function () {
    
    /**
     * GET /api/public/interactions/{type}/{id}/statistics - Stats publiques
     * Mêmes données mais sans authentification requise
     */
    Route::get('/{type}/{id}/statistics', [InteractionController::class, 'publicStatistics'])->name('interactions.public.statistics');
    
    /**
     * GET /api/public/interactions/comments/{commentableType}/{commentableId} - Liste des commentaires publics
     * Paramètres : ?page=1&per_page=10
     * Retourne : commentaires principaux + réponses hiérarchiques
     */
    Route::get('/comments/{commentableType}/{commentableId}', [InteractionController::class, 'getComments'])->name('interactions.public.comments');
    
    /**
     * GET /api/public/interactions/top-posts - Posts les plus engageants
     * Paramètres : ?type=blog|social&period=week|month&limit=10
     */
    Route::get('/top-posts', [InteractionController::class, 'topPosts'])->name('interactions.public.top-posts');
    
});