<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\FollowController;

// ===== ROUTES FOLLOW SYSTEM =====
    
    /**
     * ✅ NOUVEAU : Système de follow entre utilisateurs
     * Routes pour suivre/ne plus suivre des auteurs
     */
    Route::prefix('follow')->name('follow.')->group(function () {
        // Suivre/Ne plus suivre un utilisateur
        Route::post('/toggle', [FollowController::class, 'toggle'])
            ->name('toggle');
        
        // Vérifier le statut de follow d'un utilisateur
        Route::get('/status/{userId}', [FollowController::class, 'checkStatus'])
            ->name('status');
        
        // Liste des utilisateurs suivis
        Route::get('/following', [FollowController::class, 'following'])
            ->name('following');
        
        // Liste des followers
        Route::get('/followers', [FollowController::class, 'followers'])
            ->name('followers');
        
        // Statistiques de follow
        Route::get('/stats', [FollowController::class, 'stats'])
            ->name('stats');
        
        // Suggestions d'utilisateurs à suivre
        Route::get('/suggestions', [FollowController::class, 'suggestions'])
            ->name('suggestions');
        
        // Statut de follow pour plusieurs utilisateurs
        Route::post('/batch-status', [FollowController::class, 'batchStatus'])
            ->name('batch-status');
    });