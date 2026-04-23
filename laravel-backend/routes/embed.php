<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\EmbedController;

/**
 * Routes dédiées à l'Embed Blog (intégration sur sites clients)
 * Préfixe : /api/embed
 * ✅ ROUTES PUBLIQUES - Pas d'authentification requise pour l'embed
 */

Route::prefix('embed')->middleware(['embed.cors'])->group(function () {
    
    // ===== ROUTES EMBED BLOG - PUBLIQUES =====
    
    /**
     * GET /api/embed/blogs?client_id=CLIENT_ID - Flux d'articles pour widget JavaScript (PUBLIC)
     * Paramètres : ?client_id=USER_ID (obligatoire)
     * Retourne : { clientName, clientUrl, articles[] } avec extraits personnalisés
     * ✅ SANS AUTHENTIFICATION - Widget JavaScript public
     */
    Route::get('/blogs', [EmbedController::class, 'getBlogFeed'])
         ->name('embed.blogs.feed');
    
    /**
     * GET /api/embed/blog/{slug} - Article complet avec backlink (PUBLIC)
     * Paramètres : ?client_id=USER_ID&utm_source=client_site&utm_medium=blog_embed
     * Retourne : Article complet avec stats + backlink vers site client
     * ✅ SANS AUTHENTIFICATION - Page article accessible via embed
     */
    Route::get('/blog/{slug}', [EmbedController::class, 'getBlogArticle'])
         ->name('embed.blog.article');
    
    // ===== ROUTES PREMIUM (EXPORT) - PUBLIQUES AVEC VALIDATION CLIENT_ID =====
    
    /**
     * GET /api/embed/blog/article/{id}?client_id=CLIENT_ID - Export article complet (PREMIUM)
     * Paramètres : ?client_id=USER_ID (obligatoire)
     * Retourne : Article avec contenu + backlink obligatoire pour import CMS
     * ✅ VALIDATION CLIENT_ID - Seulement le propriétaire peut exporter
     */
    Route::get('/blog/article/{id}', [EmbedController::class, 'exportBlogArticle'])
         ->name('embed.blog.export');
    
    // ===== NOUVEAUX ENDPOINTS POUR FORMULAIRES DYNAMIQUES =====
    
    /**
     * POST /api/embed/contact - Soumission du formulaire de contact
     * Paramètres : name, email, message, client_id
     * ✅ SANS AUTHENTIFICATION - Validation par client_id
     */
    Route::post('/contact', [EmbedController::class, 'handleContactForm'])
         ->name('embed.contact');
    
    /**
     * POST /api/embed/reservation - Soumission du formulaire de réservation
     * Paramètres : name, email, phone, date (optionnel), message (optionnel), client_id, reservation_type
     * ✅ SANS AUTHENTIFICATION - Validation par client_id
     */
    Route::post('/reservation', [EmbedController::class, 'handleReservationForm'])
         ->name('embed.reservation');
});