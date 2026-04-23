<?php

use App\Http\Controllers\API\Booking\BookingProductController;
use App\Http\Controllers\API\Booking\BookingReservationController;
use App\Http\Controllers\API\Booking\BookingSupplierController;
use App\Http\Controllers\API\Booking\BookingExpenseController;
use App\Http\Controllers\API\Booking\BookingSettingsController;
use App\Http\Controllers\API\Booking\BookingEmailTemplateController;
use App\Http\Controllers\API\Booking\BookingStatsController;
use App\Http\Controllers\API\Booking\BookingWorkspaceController;
use App\Http\Controllers\API\Booking\PublicBookingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Booking Routes
|--------------------------------------------------------------------------
| Routes pour la gestion des réservations, produits, fournisseurs, CGV, etc.
| Scoped par siteId.
|
| Plan gating :
|   - booking.plan:starter → Starter, Pro, Premium
|   - booking.plan:pro     → Pro et Premium uniquement
*/

// ===== ROUTES PUBLIQUES (formulaire de réservation côté visiteur) =====
Route::prefix('public/booking/{siteId}')->group(function () {
    Route::get('/products',      [PublicBookingController::class, 'getProducts']);
    Route::get('/availability',  [PublicBookingController::class, 'checkAvailability']);
    Route::post('/reservations', [PublicBookingController::class, 'createReservation']);
    Route::get('/cgv',           [PublicBookingController::class, 'getCgv']);
});

// ===== ROUTES PROTÉGÉES =====
Route::middleware(['auth:sanctum', 'workspace.active'])->group(function () {

    // --- Vue Globale Workspace (tous sites) ---
    Route::get('/booking/workspace/sites', [BookingWorkspaceController::class, 'sitesData']);

    // --- Plan Starter+ ---
    Route::prefix('booking/{siteId}')
        ->middleware('booking.plan:starter')
        ->group(function () {

            // Produits
            Route::get('/products',                      [BookingProductController::class, 'index']);
            Route::post('/products',                     [BookingProductController::class, 'store']);
            Route::get('/products/{id}',                 [BookingProductController::class, 'show']);
            Route::put('/products/{id}',                 [BookingProductController::class, 'update']);
            Route::delete('/products/{id}',              [BookingProductController::class, 'destroy']);
            Route::post('/products/{id}/images',         [BookingProductController::class, 'uploadImage']);
            Route::delete('/products/{id}/images/{imageId}', [BookingProductController::class, 'deleteImage']);
            Route::get('/products/{id}/seasons',         [BookingProductController::class, 'getSeasons']);
            Route::post('/products/{id}/seasons',        [BookingProductController::class, 'upsertSeason']);
            Route::delete('/products/{id}/seasons/{season}', [BookingProductController::class, 'deleteSeason']);

            // Réservations
            Route::get('/reservations',                  [BookingReservationController::class, 'index']);
            Route::post('/reservations',                 [BookingReservationController::class, 'store']);
            Route::get('/reservations/{id}',             [BookingReservationController::class, 'show']);
            Route::put('/reservations/{id}',             [BookingReservationController::class, 'update']);
            Route::delete('/reservations/{id}',          [BookingReservationController::class, 'destroy']);
            Route::post('/reservations/{id}/status',     [BookingReservationController::class, 'updateStatus']);
            Route::get('/availability',                  [BookingReservationController::class, 'checkAvailability']);

            // Paramètres (CGV + devis config)
            Route::get('/settings',                      [BookingSettingsController::class, 'getAll']);
            Route::get('/settings/{key}',                [BookingSettingsController::class, 'get']);
            Route::put('/settings/{key}',                [BookingSettingsController::class, 'set']);

            // Templates email
            Route::get('/email-templates',               [BookingEmailTemplateController::class, 'index']);
            Route::post('/email-templates',              [BookingEmailTemplateController::class, 'upsert']);
        });

    // --- Plan Pro+ uniquement ---
    Route::prefix('booking/{siteId}')
        ->middleware('booking.plan:pro')
        ->group(function () {

            // Statistiques avancées
            Route::get('/stats',                         [BookingStatsController::class, 'index']);

            // Fournisseurs
            Route::get('/suppliers',                     [BookingSupplierController::class, 'index']);
            Route::post('/suppliers',                    [BookingSupplierController::class, 'store']);
            Route::put('/suppliers/{id}',                [BookingSupplierController::class, 'update']);
            Route::delete('/suppliers/{id}',             [BookingSupplierController::class, 'destroy']);
            Route::post('/suppliers/{id}/prices',        [BookingSupplierController::class, 'upsertPrice']);
            Route::delete('/suppliers/{id}/prices/{priceId}', [BookingSupplierController::class, 'deletePrice']);

            // Dépenses
            Route::get('/expenses',                      [BookingExpenseController::class, 'index']);
            Route::post('/expenses',                     [BookingExpenseController::class, 'store']);
            Route::put('/expenses/{id}',                 [BookingExpenseController::class, 'update']);
            Route::delete('/expenses/{id}',              [BookingExpenseController::class, 'destroy']);
        });
});
