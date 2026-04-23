<?php

// laravel-backend/routes/tickets.php
// ✅ ROUTES COMPLÈTES POUR LA GESTION DES TICKETS (USER + ADMIN)

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Ticket\TicketController;
use App\Http\Controllers\Ticket\TicketMessageController;
use App\Http\Controllers\Admin\TicketAdminController;

/*
|--------------------------------------------------------------------------
| Ticket Routes
|--------------------------------------------------------------------------
|
| Routes pour la gestion des tickets de support
| Ces routes sont automatiquement préfixées par /api/tickets et protégées par auth:sanctum
|
*/

// ===== ROUTES UTILISATEUR (tickets côté client) =====

// Lister tous les tickets de l'utilisateur
Route::get('/', [TicketController::class, 'index'])
     ->name('tickets.index');

// Créer un nouveau ticket
Route::post('/', [TicketController::class, 'store'])
     ->name('tickets.store');

// Afficher un ticket spécifique
Route::get('/{ticket}', [TicketController::class, 'show'])
     ->name('tickets.show');

// Supprimer un ticket
Route::delete('/{ticket}', [TicketController::class, 'destroy'])
     ->name('tickets.destroy');

// ===== GESTION DES MESSAGES (côté utilisateur) =====

// Ajouter une réponse à un ticket
Route::post('/{ticket}/messages', [TicketMessageController::class, 'store'])
     ->name('tickets.add-reply');

// Lister les réponses d'un ticket
Route::get('/{ticket}/messages', [TicketMessageController::class, 'index'])
     ->name('tickets.get-replies');

// ✅ NOUVEAU : Soumettre un feedback de satisfaction
Route::post('/{ticket}/feedback', [TicketController::class, 'submitFeedback'])
     ->name('tickets.submit-feedback');

// ===== ROUTES ADMIN (gestion tickets côté administration) =====
// Note: Ces routes sont déjà définies dans admin.php mais on les documente ici pour référence

/*
Routes admin disponibles dans admin.php :
- GET    /api/admin/tickets                    -> TicketAdminController@index
- GET    /api/admin/tickets/{ticket}           -> TicketAdminController@show  
- PUT    /api/admin/tickets/{ticket}           -> TicketAdminController@update
- DELETE /api/admin/tickets/{ticket}           -> TicketAdminController@destroy
- GET    /api/admin/tickets/{ticket}/messages  -> TicketAdminController@messages
- POST   /api/admin/tickets/{ticket}/messages  -> TicketAdminController@storeMessage
*/

// Note: Les routes admin sont gérées dans routes/admin.php avec le middleware 'admin'
// Cela évite la duplication et maintient la séparation des responsabilitésy