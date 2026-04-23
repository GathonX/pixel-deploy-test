<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\SiteBuilder\SectionTypeController;
use App\Http\Controllers\API\SiteBuilder\TemplateController;
use App\Http\Controllers\API\SiteBuilder\TemplatePageController;
use App\Http\Controllers\API\SiteBuilder\TemplateSectionController;
use App\Http\Controllers\API\SiteBuilder\SiteBuilderController;
use App\Http\Controllers\API\SiteBuilder\SiteController;
use App\Http\Controllers\API\SiteBuilder\SitePageController;
use App\Http\Controllers\API\SiteBuilder\SiteSectionController;
use App\Http\Controllers\API\SiteBuilder\SiteGlobalSectionController;
use App\Http\Controllers\API\SiteBuilder\PreviewController;
use App\Http\Controllers\API\SiteBuilder\SiteLanguageController;
use App\Http\Controllers\API\SiteBuilder\ResolveLanguageController;
use App\Http\Controllers\API\SiteBuilder\TranslateController;
use App\Http\Controllers\API\SiteBuilder\SitePublicDataController;
use App\Http\Controllers\API\SiteProductController;
use App\Http\Controllers\API\TaskController;
use App\Http\Controllers\API\SiteBuilder\SiteTaskController;

/*
|--------------------------------------------------------------------------
| Site Builder API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('site-builder')->group(function () {

    // ===== ROUTES PUBLIQUES =====

    // Preview public (pas besoin d'authentification)
    Route::get('preview/token/{token}', [PreviewController::class, 'show']);
    Route::get('preview/domain/{domain}', [PreviewController::class, 'showByDomain']);

    // Types de sections (public pour le rendu)
    Route::get('section-types', [SectionTypeController::class, 'index']);
    Route::get('section-types/{id}', [SectionTypeController::class, 'show']);

    // Templates actifs (public)
    Route::get('templates', [TemplateController::class, 'index']);
    Route::get('templates/{id}', [TemplateController::class, 'show']);

    // Données publiques du site (blog + contact, sans auth)
    Route::get('public/sites/{siteId}/meta',    [SitePublicDataController::class, 'meta']);
    Route::get('public/sites/{siteId}/posts',        [SitePublicDataController::class, 'posts']);
    Route::get('public/sites/{siteId}/posts/{slug}', [SitePublicDataController::class, 'post']);
    Route::post('public/sites/{siteId}/contact',     [SitePublicDataController::class, 'contact']);


    // ===== ROUTES PROTÉGÉES (utilisateur connecté) =====

    Route::middleware('auth:sanctum')->group(function () {

        // --- Sites utilisateur ---
        Route::get('sites', [SiteController::class, 'index']);
        Route::post('sites', [SiteController::class, 'store']);
        Route::get('sites/{id}', [SiteController::class, 'show']);
        Route::put('sites/{id}', [SiteController::class, 'update']);
        Route::delete('sites/{id}', [SiteController::class, 'destroy']);
        Route::post('sites/{id}/publish', [SiteController::class, 'publish']);
        Route::post('sites/{id}/unpublish', [SiteController::class, 'unpublish']);
        Route::post('sites/{id}/upload-image', [SiteController::class, 'uploadSectionImage']);
        Route::post('sites/{id}/domains', [SiteController::class, 'addDomain']);
        Route::post('sites/{id}/domains/{domainId}/verify', [SiteController::class, 'verifyDomain']);
        Route::delete('sites/{id}/domains/{domainId}', [SiteController::class, 'deleteDomain']);

        // --- Produits du site (avec saisons) ---
        Route::post('sites/{siteId}/products/upload-image', [SiteProductController::class, 'uploadImage']);
        Route::get('sites/{siteId}/products', [SiteProductController::class, 'index']);
        Route::post('sites/{siteId}/products', [SiteProductController::class, 'store']);
        Route::get('sites/{siteId}/products/{id}', [SiteProductController::class, 'show']);
        Route::put('sites/{siteId}/products/{id}', [SiteProductController::class, 'update']);
        Route::patch('sites/{siteId}/products/{id}/toggle', [SiteProductController::class, 'toggle']);
        Route::delete('sites/{siteId}/products/{id}', [SiteProductController::class, 'destroy']);

        // --- Tâches du site (Pro uniquement) ---
        Route::middleware('pro.feature')->group(function () {
            Route::get('sites/{siteId}/tasks/members', [SiteTaskController::class, 'members']);
            Route::get('sites/{siteId}/tasks', [SiteTaskController::class, 'index']);
            Route::post('sites/{siteId}/tasks', [SiteTaskController::class, 'store']);
            Route::put('sites/{siteId}/tasks/{taskId}', [SiteTaskController::class, 'update']);
            Route::patch('sites/{siteId}/tasks/{taskId}/status', [SiteTaskController::class, 'updateStatus']);
            Route::delete('sites/{siteId}/tasks/{taskId}', [SiteTaskController::class, 'destroy']);
        });

        // --- Traduction automatique du site (OpenAI) ---
        Route::post('sites/{siteId}/translate', [TranslateController::class, 'translate']);

        // --- Langues du site (gating quota plan) ---
        Route::post('resolve-language', [ResolveLanguageController::class, 'resolve']);
        Route::get('sites/{siteId}/languages', [SiteLanguageController::class, 'index']);
        Route::post('sites/{siteId}/languages', [SiteLanguageController::class, 'store']);
        Route::delete('sites/{siteId}/languages/{languageId}', [SiteLanguageController::class, 'destroy']);
        Route::post('sites/{siteId}/languages/{languageId}/set-default', [SiteLanguageController::class, 'setDefault']);

        // --- Pages de site ---
        Route::get('sites/{siteId}/pages', [SitePageController::class, 'index']);
        Route::post('sites/{siteId}/pages', [SitePageController::class, 'store']);
        Route::put('sites/{siteId}/pages/{id}', [SitePageController::class, 'update']);
        Route::delete('sites/{siteId}/pages/{id}', [SitePageController::class, 'destroy']);
        Route::post('sites/{siteId}/pages/{id}/duplicate', [SitePageController::class, 'duplicate']);

        // --- Sections de page ---
        Route::get('pages/{pageId}/sections', [SiteSectionController::class, 'index']);
        Route::post('pages/{pageId}/sections', [SiteSectionController::class, 'store']);
        Route::put('pages/{pageId}/sections/reorder', [SiteSectionController::class, 'reorder']);
        Route::put('sections/{id}', [SiteSectionController::class, 'update']);
        Route::delete('sections/{id}', [SiteSectionController::class, 'destroy']);

        // --- Sections globales (navbar/footer) ---
        Route::get('sites/{siteId}/global-sections', [SiteGlobalSectionController::class, 'index']);
        Route::get('sites/{siteId}/global-sections/{position}', [SiteGlobalSectionController::class, 'show']);
        Route::post('sites/{siteId}/global-sections', [SiteGlobalSectionController::class, 'store']);
        Route::put('global-sections/{id}', [SiteGlobalSectionController::class, 'update']);
        Route::delete('global-sections/{id}', [SiteGlobalSectionController::class, 'destroy']);


        // ===== ROUTES ADMIN =====

        Route::middleware('admin')->prefix('admin')->group(function () {

            // Dashboard stats
            Route::get('stats', [SiteBuilderController::class, 'stats']);

            // Upload image template
            Route::post('upload-template-image', [TemplateController::class, 'uploadImage']);

            // Templates (CRUD complet)
            Route::get('templates', [TemplateController::class, 'adminIndex']);
            Route::post('templates', [TemplateController::class, 'store']);
            Route::put('templates/{id}', [TemplateController::class, 'update']);
            Route::delete('templates/{id}', [TemplateController::class, 'destroy']);
            Route::post('templates/{id}/duplicate', [TemplateController::class, 'duplicate']);
            Route::post('templates/{id}/archive', [TemplateController::class, 'archive']);

            // Pages de template
            Route::get('templates/{templateId}/pages', [TemplatePageController::class, 'index']);
            Route::post('templates/{templateId}/pages', [TemplatePageController::class, 'store']);
            Route::put('template-pages/{id}', [TemplatePageController::class, 'update']);
            Route::delete('template-pages/{id}', [TemplatePageController::class, 'destroy']);

            // Sections de template
            Route::get('template-pages/{pageId}/sections', [TemplateSectionController::class, 'index']);
            Route::post('template-pages/{pageId}/sections', [TemplateSectionController::class, 'store']);
            Route::put('template-sections/{id}', [TemplateSectionController::class, 'update']);
            Route::delete('template-sections/{id}', [TemplateSectionController::class, 'destroy']);

            // Paramètres
            Route::get('settings', [SiteBuilderController::class, 'show']);
            Route::put('settings', [SiteBuilderController::class, 'update']);
        });
    });
});
