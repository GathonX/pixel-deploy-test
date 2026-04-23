<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\UserController;

// ===== ROUTES UTILISATEURS =====

/**
 * ✅ NOUVEAU : Système de gestion des utilisateurs
 * Routes pour récupérer les profils et statistiques des auteurs
 */

// ===== ROUTES PUBLIQUES =====

Route::prefix('public/users')->name('public.users.')->group(function () {
    
    /**
     * GET /api/public/users/{id} - Profil public d'un utilisateur
     * Retourne les informations publiques d'un auteur
     */
    Route::get('/{id}', [UserController::class, 'showPublic'])
        ->name('show');
    
    /**
     * GET /api/public/users/{id}/stats - Statistiques publiques d'un utilisateur
     * Retourne les stats publiques (articles, likes, vues)
     */
    Route::get('/{id}/stats', [UserController::class, 'getPublicStats'])
        ->name('stats');
    
    /**
     * GET /api/public/users/popular-authors - Auteurs populaires
     * Retourne la liste des auteurs les plus actifs/populaires
     */
    Route::get('/popular-authors', [UserController::class, 'getPopularAuthors'])
        ->name('popular-authors');
    
    /**
     * GET /api/public/users/search - Recherche d'auteurs
     * Recherche d'utilisateurs par nom/email (données publiques seulement)
     */
    Route::get('/search', [UserController::class, 'searchPublic'])
        ->name('search');
    
});

// ===== ROUTES PROTÉGÉES =====

Route::middleware('auth:sanctum')->prefix('users')->name('users.')->group(function () {
    
    /**
     * GET /api/users/{id} - Profil complet d'un utilisateur
     * Retourne toutes les informations d'un utilisateur (selon permissions)
     */
    Route::get('/{id}', [UserController::class, 'show'])
        ->name('show');
    
    /**
     * GET /api/users/{id}/stats - Statistiques complètes d'un utilisateur
     * Retourne les statistiques détaillées d'un utilisateur
     */
    Route::get('/{id}/stats', [UserController::class, 'getStats'])
        ->name('stats');
    
    /**
     * GET /api/users/search - Recherche d'utilisateurs (avec plus de détails)
     * Recherche avancée d'utilisateurs pour utilisateurs connectés
     */
    Route::get('/search', [UserController::class, 'search'])
        ->name('search');
    
    /**
     * GET /api/users/popular-authors - Auteurs populaires (version étendue)
     * Version étendue avec plus de détails pour utilisateurs connectés
     */
    Route::get('/popular-authors', [UserController::class, 'getPopularAuthorsExtended'])
        ->name('popular-authors-extended');
    
    /**
     * GET /api/users/{id}/articles - Articles d'un utilisateur
     * Retourne tous les articles d'un utilisateur (selon permissions)
     */
    Route::get('/{id}/articles', [UserController::class, 'getUserArticles'])
        ->name('articles');
    
    /**
     * GET /api/users/{id}/social-posts - Posts sociaux d'un utilisateur
     * Retourne les posts sociaux d'un utilisateur (selon permissions)
     */
    Route::get('/{id}/social-posts', [UserController::class, 'getUserSocialPosts'])
        ->name('social-posts');
    
    /**
     * PUT /api/users/{id}/profile - Mettre à jour le profil (propriétaire seulement)
     * Met à jour les informations de profil de l'utilisateur
     */
    Route::put('/{id}/profile', [UserController::class, 'updateProfile'])
        ->middleware('can:update,App\Models\User')
        ->name('update-profile');
    
    /**
     * POST /api/users/{id}/follow - Suivre un utilisateur (alias de /follow/toggle)
     * Route alternative pour suivre un utilisateur
     */
    Route::post('/{id}/follow', [UserController::class, 'followUser'])
        ->name('follow');
    
    /**
     * DELETE /api/users/{id}/follow - Ne plus suivre un utilisateur
     * Route alternative pour ne plus suivre un utilisateur
     */
    Route::delete('/{id}/follow', [UserController::class, 'unfollowUser'])
        ->name('unfollow');

});