<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\Reservation\ReservationController;

/*
|--------------------------------------------------------------------------
| Reservation Routes
|--------------------------------------------------------------------------
|
| Routes pour le système de réservation Pixel-Rise
| Préfixe automatique : /api/reservations/
| 
| Structure organisée :
| - Routes publiques (formulaires iFrame)
| - Routes protégées (gestion client)
| - Routes dashboard (nouvelles)
|
*/

// Anciennes routes publiques supprimées — réservations gérées via /api/public/booking/{siteId}/reservations

// ===== 🔐 ROUTES PROTÉGÉES =====

/**
 * Routes protégées pour la gestion des réservations
 * Middleware : auth:sanctum (authentification requise)
 */
Route::middleware(['auth:sanctum'])->group(function () {

    // Calendrier des réservations du mois
    Route::get('/calendar', [ReservationController::class, 'getCalendarReservations'])
         ->name('reservations.calendar');

    // ===== ✅ NOUVELLES ROUTES DASHBOARD =====

    /**
     * ✅ NOUVEAU : Dashboard des réservations
     * GET /api/reservations/dashboard
     * Toutes les réservations de l'utilisateur connecté avec filtres
     */
    Route::get('/dashboard', [ReservationController::class, 'getDashboardReservations'])
         ->name('reservations.dashboard');

    /**
     * ✅ NOUVEAU : Statistiques dashboard
     * GET /api/reservations/dashboard/stats
     * Statistiques complètes avec graphiques
     */
    Route::get('/dashboard/stats', [ReservationController::class, 'getDashboardStats'])
         ->name('reservations.dashboard.stats');

    /**
     * Export CSV des réservations — fonctionnalité Pro
     * GET /api/reservations/dashboard/export
     */
    Route::get('/dashboard/export', [ReservationController::class, 'exportCsv'])
         ->middleware('pro.feature')
         ->name('reservations.dashboard.export');

    /**
     * Analytics avancées réservations — fonctionnalité Pro
     * GET /api/reservations/dashboard/analytics?year=Y
     */
    Route::get('/dashboard/analytics', [ReservationController::class, 'getAnalytics'])
         ->middleware('pro.feature')
         ->name('reservations.dashboard.analytics');

    /**
     * ✅ NOUVEAU : Détails réservation dashboard
     * GET /api/reservations/dashboard/{id}
     * Détails complets d'une réservation avec métadonnées
     */
    Route::get('/dashboard/{id}', [ReservationController::class, 'getDashboardReservationDetails'])
         ->name('reservations.dashboard.details');

    /**
     * ✅ NOUVEAU : Modifier statut réservation dashboard
     * PUT /api/reservations/dashboard/{id}/status
     * Mise à jour du statut avec historique
     */
    Route::put('/dashboard/{id}/status', [ReservationController::class, 'updateReservationStatus'])
         ->name('reservations.dashboard.update-status');

    /**
     * ✅ NOUVEAU : Supprimer une réservation
     * DELETE /api/reservations/dashboard/{id}
     * Suppression définitive d'une réservation
     */
    Route::delete('/dashboard/{id}', [ReservationController::class, 'deleteReservation'])
         ->name('reservations.dashboard.delete');

    // Anciennes routes legacy supprimées — gérez les réservations via le dashboard mada-booking

});