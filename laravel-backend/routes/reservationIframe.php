<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Reservation iFrame Routes (Web)
|--------------------------------------------------------------------------
|
| Routes web pour servir les iFrames de réservation
| Design neutre pour intégration sur sites clients
| Pas de thème Pixel-Rise
|
*/

// ===== IFRAME ROUTES (PUBLIC) =====

/**
 * iFrame formulaire rapide (homepage des clients)
 * GET /iframe/reservation-quick?client_id=xxx
 * Design : Minimal, neutre
 */
Route::get('/iframe/reservation-quick', function () {
    return view('reservations.iframe.quick', [
        'client_id' => request('client_id'),
        'api_url' => config('app.url') . '/api'
    ]);
})->name('iframe.reservation.quick');

/**
 * iFrame formulaire complet (page contact des clients)
 * GET /iframe/reservation-full?client_id=xxx&token=xxx
 * Design : Minimal, neutre
 * Token optionnel pour auto-completion
 */
Route::get('/iframe/reservation-full', function () {
    return view('reservations.iframe.full', [
        'client_id' => request('client_id'),
        'completion_token' => request('token'),
        'api_url' => config('app.url') . '/api'
    ]);
})->name('iframe.reservation.full');

/**
 * iFrame formulaire de contact (sites clients)
 * GET /iframe/contact?client_id=xxx
 * Design : Minimal, neutre
 */
Route::get('/iframe/contact', function () {
    return view('contact.iframe.contact', [
        'client_id' => request('client_id'),
        'api_url' => config('app.url') . '/api'
    ]);
})->name('iframe.contact');

/**
 * Page de completion avec interface Pixel-Rise
 * GET /reservation-complete?token=xxx&client_id=xxx
 * Page complète avec navbar et thème Pixel-Rise
 */
Route::get('/reservation-complete', function () {
    $token = request('token');
    $clientId = request('client_id', 'default');
    
    if (!$token) {
        abort(400, 'Token manquant');
    }
    
    // Retourner la page Pixel-Rise complète
    return view('reservations.complete', [
        'completion_token' => $token,
        'client_id' => $clientId,
        'api_url' => config('app.url') . '/api'
    ]);
})->name('reservation.complete');

// ===== PAGES APPLICATION INTERNE (AVEC THÈME PIXEL) =====

/**
 * Pages réservations dans l'application (thème Pixel-Rise)
 * Routes pour l'interface interne de gestion
 * CORRIGÉ : Middleware correct
 */
Route::middleware(['auth:sanctum', 'verified'])->prefix('app/reservations')->group(function () {
    
    /**
     * Dashboard réservations (thème Pixel)
     */
    Route::get('/', function () {
        return view('reservations.app.dashboard');
    })->name('app.reservations.dashboard');
    
    /**
     * Formulaire rapide interne (thème Pixel)
     */
    Route::get('/quick', function () {
        return view('reservations.app.quick');
    })->name('app.reservations.quick');
    
    /**
     * Formulaire complet interne (thème Pixel)
     */
    Route::get('/full', function () {
        return view('reservations.app.full');
    })->name('app.reservations.full');
    
    /**
     * Gestion des réservations (thème Pixel)
     */
    Route::get('/manage', function () {
        return view('reservations.app.manage');
    })->name('app.reservations.manage');
    
});