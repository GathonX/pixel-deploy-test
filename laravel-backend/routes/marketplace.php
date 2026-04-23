<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\Marketplace\ProductController;
use App\Http\Controllers\API\Marketplace\CategoryController;
use App\Http\Controllers\API\Marketplace\OrderController;
use App\Http\Controllers\API\Marketplace\InventoryController;

Route::prefix('marketplace')->group(function () {

    // Routes publiques
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);

    // Routes authentifiées
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders/{id}', [OrderController::class, 'show']);
        Route::post('/orders/{id}/payment-proof', [OrderController::class, 'uploadPaymentProof']);
    });

    // Routes admin
    Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
        // Products
        Route::apiResource('products', ProductController::class)->except(['index', 'show']);

        // Categories
        Route::apiResource('categories', CategoryController::class)->except(['index', 'show']);

        // Orders
        Route::get('orders', [OrderController::class, 'adminIndex']);
        Route::put('orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::put('orders/{id}/payment-status', [OrderController::class, 'updatePaymentStatus']);

        // Inventory
        Route::get('inventory', [InventoryController::class, 'index']);
        Route::post('inventory/{productId}/adjust', [InventoryController::class, 'adjustStock']);
        Route::get('inventory/{productId}/logs', [InventoryController::class, 'getLogs']);
    });
});
