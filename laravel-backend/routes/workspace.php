<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\WorkspaceController;
use App\Http\Controllers\API\BillingController;
use App\Http\Controllers\API\WorkspaceUsersController;
use App\Http\Controllers\API\WorkspaceInvitationController;
use App\Http\Controllers\API\AdminWorkspaceController;

/*
|--------------------------------------------------------------------------
| Workspace API Routes
|--------------------------------------------------------------------------
*/

// Création du workspace (onboarding — hors workspace.active)
Route::post('workspace/setup', [WorkspaceController::class, 'setup'])
    ->middleware('auth:sanctum');

// Liste tous les workspaces possédés (hors workspace.active — utilisé pour sélecteur client)
Route::get('workspace/all', [WorkspaceController::class, 'listOwned'])
    ->middleware('auth:sanctum');

Route::prefix('workspace')
    ->middleware(['auth:sanctum', 'workspace.active'])
    ->group(function () {
        // Workspace info & plan
        Route::get('/', [WorkspaceController::class, 'show']);
        Route::put('/', [WorkspaceController::class, 'update']);
        Route::delete('/', [WorkspaceController::class, 'destroy']);
        Route::get('/plan', [WorkspaceController::class, 'planSummary']);
        Route::get('/overview', [WorkspaceController::class, 'overview']);
        Route::get('/can-publish/{siteId}', [WorkspaceController::class, 'canPublish']);

        // Membres du workspace
        Route::prefix('users')->group(function () {
            Route::get('/', [WorkspaceUsersController::class, 'index']);
            Route::post('/invite', [WorkspaceUsersController::class, 'invite']);
            Route::put('/{userId}/role', [WorkspaceUsersController::class, 'updateRole']);
            Route::delete('/{userId}', [WorkspaceUsersController::class, 'remove']);
            // PIN protection données client
            Route::post('/set-pin', [WorkspaceUsersController::class, 'setClientPin']);
            Route::delete('/remove-pin', [WorkspaceUsersController::class, 'removeClientPin']);
        });

        // Sites summary (dashboard entreprise)
        Route::get('/sites-summary', [WorkspaceController::class, 'getSitesSummary']);

        // Livraison workspace au client (owner uniquement)
        Route::post('/deliver', [WorkspaceController::class, 'deliver']);

        // Demande d'aide — client invite l'owner à rejoindre son workspace
        Route::post('/request-help', [WorkspaceController::class, 'requestHelp']);

        // Invitations (protégées)
        Route::prefix('invitations')->group(function () {
            Route::get('/', [WorkspaceInvitationController::class, 'index']);
            Route::post('/', [WorkspaceInvitationController::class, 'store']);
            Route::delete('/{id}', [WorkspaceInvitationController::class, 'cancel']);
        });

        // Facturation (côté client)
        Route::prefix('billing')->group(function () {
            Route::get('/invoices', [BillingController::class, 'index']);
            Route::get('/invoices/{id}', [BillingController::class, 'show']);
            Route::post('/invoices/workspace', [BillingController::class, 'createWorkspaceInvoice']);
            Route::post('/invoices/site', [BillingController::class, 'createSiteInvoice']);
            Route::post('/invoices/{id}/payment-proof', [BillingController::class, 'submitPaymentProof']);
        });
    });

// Admin billing (admin uniquement)
Route::prefix('admin/billing')
    ->middleware(['auth:sanctum', 'admin'])
    ->group(function () {
        Route::get('/invoices', [BillingController::class, 'adminIndex']);
        Route::post('/invoices/{id}/confirm', [BillingController::class, 'confirmPayment']);
    });

// Admin workspaces (admin uniquement)
Route::prefix('admin/workspaces')
    ->middleware(['auth:sanctum', 'admin'])
    ->group(function () {
        Route::get('/stats', [AdminWorkspaceController::class, 'stats']);
        Route::get('/', [AdminWorkspaceController::class, 'index']);
        Route::get('/{id}', [AdminWorkspaceController::class, 'show']);
        Route::put('/{id}/status', [AdminWorkspaceController::class, 'updateStatus']);
    });
