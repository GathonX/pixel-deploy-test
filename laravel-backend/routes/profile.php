<?php

// laravel-backend/routes/profile.php - Routes Profile Complètes

use App\Http\Controllers\Profile\ProfileController;
use App\Http\Controllers\Auth\AccountDeletionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Profile API Routes
|--------------------------------------------------------------------------
|
| Routes pour la gestion du profil utilisateur
| Toutes ces routes nécessitent une authentification Sanctum
|
*/

Route::middleware(['auth:sanctum'])->prefix('profile')->name('profile.')->group(function () {
    
    // GET /api/profile - Récupérer le profil
    Route::get('/', [ProfileController::class, 'index'])->name('index');
    
    // PUT /api/profile - Mettre à jour le profil  
    Route::put('/', [ProfileController::class, 'update'])->name('update');
    
    // POST /api/profile/avatar - Upload avatar
    Route::post('/avatar', [ProfileController::class, 'uploadAvatar'])->name('avatar.upload');
    
    // DELETE /api/profile/avatar - Supprimer avatar
    Route::delete('/avatar', [ProfileController::class, 'deleteAvatar'])->name('avatar.delete');
    
});

/*
|--------------------------------------------------------------------------
| Account Management Routes
|--------------------------------------------------------------------------
|
| Routes pour la gestion du compte utilisateur (suppression)
| Toutes ces routes nécessitent une authentification Sanctum
|
*/

Route::middleware(['auth:sanctum'])->prefix('account')->name('account.')->group(function () {
    
    /**
     * GET /api/account/deletion-reasons - Récupérer les raisons de suppression
     */
    Route::get('/deletion-reasons', [AccountDeletionController::class, 'getDeletionReasons'])
         ->name('deletion-reasons');
    
    /**
     * POST /api/account/delete-request - Demande de suppression de compte
     * ✅ CORRECTION : Utilise le contrôleur AccountDeletionController existant
     */
    Route::post('/delete-request', [AccountDeletionController::class, 'requestDelete'])
         ->name('delete-request');
    
});