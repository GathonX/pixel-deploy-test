<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\StudioDomaine\DomainController;
use App\Http\Controllers\API\StudioDomaine\RequestController;

/*
|--------------------------------------------------------------------------
| Studio Domaine API Routes
|--------------------------------------------------------------------------
|
| Routes pour le module Studio Domaine - Gestion des noms de domaine
| Préfixe: /api/studio-domaine
|
*/

Route::prefix('studio-domaine')->group(function () {

    // ===== ROUTES PUBLIQUES =====

    // Domain routes (recherche de domaine)
    Route::prefix('domain')->group(function () {

        /**
         * POST /api/studio-domaine/domain/check
         * Vérifier la disponibilité d'un domaine unique
         */
        Route::post('/check', [DomainController::class, 'check'])
            ->middleware('throttle:30,1')
            ->name('studio-domaine.domain.check');

        /**
         * POST /api/studio-domaine/domain/search
         * Rechercher un nom sur plusieurs extensions
         */
        Route::post('/search', [DomainController::class, 'search'])
            ->middleware('throttle:20,1')
            ->name('studio-domaine.domain.search');

        /**
         * GET /api/studio-domaine/domain/pricing
         * Obtenir les prix des TLDs
         */
        Route::get('/pricing', [DomainController::class, 'pricing'])
            ->middleware('throttle:10,1')
            ->name('studio-domaine.domain.pricing');
    });

    // ===== ROUTES PROTÉGÉES (utilisateur connecté) =====

    Route::middleware('auth:sanctum')->group(function () {

        // Domain WHOIS (protégé)
        Route::get('/domain/whois/{domain}', [DomainController::class, 'whois'])
            ->middleware('throttle:10,1')
            ->name('studio-domaine.domain.whois');

        // Requests routes (demandes utilisateur)
        Route::prefix('requests')->group(function () {

            /**
             * GET /api/studio-domaine/requests
             * Liste des demandes de l'utilisateur connecté
             */
            Route::get('/', [RequestController::class, 'index'])
                ->name('studio-domaine.requests.index');

            /**
             * POST /api/studio-domaine/requests
             * Créer une nouvelle demande
             */
            Route::post('/', [RequestController::class, 'store'])
                ->name('studio-domaine.requests.store');

            /**
             * GET /api/studio-domaine/requests/{id}
             * Détails d'une demande
             */
            Route::get('/{id}', [RequestController::class, 'show'])
                ->name('studio-domaine.requests.show');

            /**
             * PUT /api/studio-domaine/requests/{id}
             * Modifier une demande (si en attente)
             */
            Route::put('/{id}', [RequestController::class, 'update'])
                ->name('studio-domaine.requests.update');

            /**
             * DELETE /api/studio-domaine/requests/{id}
             * Annuler une demande (si en attente)
             */
            Route::delete('/{id}', [RequestController::class, 'destroy'])
                ->name('studio-domaine.requests.destroy');
        });

        // ===== ROUTES ADMIN =====

        Route::prefix('admin')->middleware('admin')->group(function () {

            // Admin Requests
            Route::prefix('requests')->group(function () {

                /**
                 * GET /api/studio-domaine/admin/requests
                 * Liste de toutes les demandes
                 */
                Route::get('/', [RequestController::class, 'adminIndex'])
                    ->name('studio-domaine.admin.requests.index');

                /**
                 * GET /api/studio-domaine/admin/requests/stats
                 * Statistiques des demandes
                 */
                Route::get('/stats', [RequestController::class, 'stats'])
                    ->name('studio-domaine.admin.requests.stats');

                /**
                 * POST /api/studio-domaine/admin/requests/{id}/in-progress
                 * Marquer en cours
                 */
                Route::post('/{id}/in-progress', [RequestController::class, 'markInProgress'])
                    ->name('studio-domaine.admin.requests.in-progress');

                /**
                 * POST /api/studio-domaine/admin/requests/{id}/activate
                 * Activer une demande
                 */
                Route::post('/{id}/activate', [RequestController::class, 'activate'])
                    ->name('studio-domaine.admin.requests.activate');

                /**
                 * POST /api/studio-domaine/admin/requests/{id}/reject
                 * Rejeter une demande
                 */
                Route::post('/{id}/reject', [RequestController::class, 'reject'])
                    ->name('studio-domaine.admin.requests.reject');

                /**
                 * DELETE /api/studio-domaine/admin/requests/{id}
                 * Supprimer définitivement une demande
                 */
                Route::delete('/{id}', [RequestController::class, 'adminDestroy'])
                    ->name('studio-domaine.admin.requests.destroy');
            });
        });
    });
});
