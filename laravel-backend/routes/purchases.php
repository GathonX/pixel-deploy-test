<?php

use App\Http\Controllers\API\PurchaseController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Purchase Orders Routes
|--------------------------------------------------------------------------
*/

// Routes protégées (utilisateur connecté)
Route::middleware('auth:sanctum')->prefix('purchases')->group(function () {

    // Admin routes (AVANT les routes avec {id} pour éviter que /{id} intercepte /admin/list)
    Route::get('/admin/list', [PurchaseController::class, 'adminIndex']);
    Route::post('/{id}/confirm', [PurchaseController::class, 'confirm']);

    // User routes
    Route::get('/', [PurchaseController::class, 'index']);
    Route::post('/', [PurchaseController::class, 'store']);
    Route::get('/{id}', [PurchaseController::class, 'show']);
    Route::post('/{id}/proof', [PurchaseController::class, 'submitProof']);
    Route::post('/{id}/upload-proof', [PurchaseController::class, 'uploadProof']);
    Route::post('/{id}/submit-payment', [PurchaseController::class, 'submitPayment']);
    Route::post('/{id}/cancel', [PurchaseController::class, 'cancel']);
});
