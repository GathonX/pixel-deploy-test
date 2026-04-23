<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\CategoryController;

/**
 * Routes dédiées aux Catégories
 * Préfixe : /api/categories
 * ✅ CORRECTION : Routes principales PUBLIQUES (sans authentification)
 */

Route::prefix('categories')->group(function () {
    
    // ===== ROUTES PRINCIPALES CATÉGORIES - PUBLIQUES =====
    
    /**
     * GET /api/categories - Liste des catégories (PUBLIC)
     * Paramètres : ?user_only=true&per_page=20&page=1&is_active=true&type=blog
     * user_only : filtrer par catégories utilisées par l'utilisateur connecté (si connecté)
     * ✅ SANS AUTHENTIFICATION - Utilise publicIndex pour contenu public
     */
    Route::get('/', [CategoryController::class, 'publicIndex'])->name('categories.index');
    
    
    // ===== ROUTES DÉCOUVERTE - PUBLIQUES =====
    
    /**
     * GET /api/categories/popular - Catégories populaires (PUBLIC)
     * Paramètres : ?limit=10
     * Triées par nombre total de posts (blog + social)
     * ✅ SANS AUTHENTIFICATION - Utilise trending pour contenu public
     */
    Route::get('/popular', [CategoryController::class, 'trending'])->name('categories.popular');
    
    /**
     * GET /api/categories/user-top - Top catégories de l'utilisateur (PROTÉGÉ)
     * Paramètres : ?limit=5
     * Catégories les plus utilisées par l'utilisateur connecté
     * ✅ AVEC AUTHENTIFICATION - Nécessite utilisateur connecté
     */
    Route::get('/user-top', [CategoryController::class, 'userTop'])
         ->middleware('auth:sanctum')
         ->name('categories.user-top');
    
    /**
     * GET /api/categories/search - Rechercher des catégories (PUBLIC)
     * Paramètres : ?q=mot-clé (minimum 2 caractères)
     * Recherche dans : name, description, slug
     * ✅ SANS AUTHENTIFICATION - Recherche publique
     */
    Route::get('/search', [CategoryController::class, 'search'])->name('categories.search');
    
    // ===== ROUTES STATISTIQUES - PUBLIQUES =====
    
    /**
     * GET /api/categories/statistics - Statistiques globales des catégories (PUBLIC)
     * Retourne : total_categories, categories_with_posts, most_used_category, avg_posts_per_category
     * ✅ SANS AUTHENTIFICATION - Statistiques publiques
     */
    Route::get('/statistics', [CategoryController::class, 'statistics'])->name('categories.statistics');

    /**
     * GET /api/categories/{id} - Détails d'une catégorie (PUBLIC)
     * Retourne : catégorie + compteurs posts + relations
     * ✅ SANS AUTHENTIFICATION - Utilise publicShow pour contenu public
     */
    Route::get('/{id}', [CategoryController::class, 'publicShow'])->name('categories.show');
    
    /**
     * GET /api/categories/{id}/posts - Posts d'une catégorie (PUBLIC)
     * Paramètres : ?type=all|blog|social&status=published
     * ✅ SANS AUTHENTIFICATION - Posts publics seulement
     */
    Route::get('/{id}/posts', [CategoryController::class, 'publicPosts'])->name('categories.posts');
    
});

/**
 * Routes catégories publiques (sans authentification)
 * Préfixe : /api/public/categories
 * ✅ CONSERVÉ - Routes publiques alternatives avec préfixe explicite
 */
Route::prefix('public/categories')->group(function () {
    
    /**
     * GET /api/public/categories - Catégories publiques
     * Paramètres : ?per_page=20&page=1
     * Seulement les catégories avec du contenu publié
     */
    Route::get('/', [CategoryController::class, 'publicIndex'])->name('categories.public.index');

    /**
     * GET /api/public/categories/trending - Catégories tendance
     * Paramètres : ?limit=10&period=week|month
     * Basé sur l'engagement récent (vues, likes, commentaires)
     */
    Route::get('/trending', [CategoryController::class, 'trending'])->name('categories.public.trending');

    /**
     * GET /api/public/categories/cloud - Nuage de catégories
     * Retourne : catégories avec poids basé sur popularité
     * Format : [{ name, slug, weight, posts_count }]
     */
    Route::get('/cloud', [CategoryController::class, 'cloud'])->name('categories.public.cloud');
    
    /**
     * GET /api/public/categories/{slug} - Catégorie publique par slug
     * Retourne : détails + posts publics
     */
    Route::get('/{slug}', [CategoryController::class, 'publicShow'])->name('categories.public.show');
    
    /**
     * GET /api/public/categories/{slug}/posts - Posts publics d'une catégorie
     * Paramètres : ?type=all|blog|social&per_page=10&page=1
     */
    Route::get('/{slug}/posts', [CategoryController::class, 'publicPosts'])->name('categories.public.posts');
    
});