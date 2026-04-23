<?php

// laravel-backend/routes/notifications.php
// ✅ ROUTES COMPLÈTES POUR LE SYSTÈME DE NOTIFICATIONS

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| Notification Routes
|--------------------------------------------------------------------------
|
| Routes pour la gestion complète des notifications utilisateur
| Préfixe automatique : /api/notifications/
| Middleware : auth:sanctum (appliqué dans api.php)
|
| Endpoints disponibles :
| - GET    /notifications                    -> Liste paginée avec filtres
| - GET    /notifications/unread-count      -> Nombre de notifications non lues
| - GET    /notifications/stats             -> Statistiques détaillées
| - POST   /notifications                   -> Créer une notification
| - POST   /notifications/{id}/read         -> Marquer comme lue (MODIFIÉ)
| - POST   /notifications/mark-all-read     -> Marquer toutes comme lues
| - POST   /notifications/{id}/archive      -> Archiver une notification
| - DELETE /notifications/{id}              -> Supprimer une notification
|
*/

// ===== 📋 CONSULTATION DES NOTIFICATIONS =====

/**
 * Liste des notifications avec filtres et pagination
 * GET /api/notifications
 * Paramètres : types, statuses, priorities, search, per_page
 */
Route::get('/', [NotificationController::class, 'index'])
     ->name('notifications.index');

/**
 * Nombre de notifications non lues
 * GET /api/notifications/unread-count
 */
Route::get('/unread-count', [NotificationController::class, 'unreadCount'])
     ->name('notifications.unread-count');

/**
 * Statistiques détaillées des notifications
 * GET /api/notifications/stats
 */
Route::get('/stats', [NotificationController::class, 'stats'])
     ->name('notifications.stats');

// ===== ✏️ GESTION DES NOTIFICATIONS =====

/**
 * Créer une nouvelle notification
 * POST /api/notifications
 */
Route::post('/', [NotificationController::class, 'store'])
     ->name('notifications.store');

/**
 * Marquer une notification comme lue
 * POST /api/notifications/{id}/read
 */
Route::post('/{id}/read', [NotificationController::class, 'markAsRead'])
     ->name('notifications.read');

/**
 * Marquer toutes les notifications comme lues
 * POST /api/notifications/mark-all-read
 * Paramètre optionnel : type (pour marquer seulement un type)
 */
Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead'])
     ->name('notifications.mark-all-read');

/**
 * Archiver une notification
 * POST /api/notifications/{id}/archive
 */
Route::post('/{id}/archive', [NotificationController::class, 'archive'])
     ->name('notifications.archive');

/**
 * Supprimer une notification
 * DELETE /notifications/{id}
 */
Route::delete('/{id}', [NotificationController::class, 'destroy'])
     ->name('notifications.destroy');

// ===== 📊 ROUTES ADDITIONNELLES (OPTIONNELLES) =====

/**
 * Marquer une notification comme non lue
 * POST /api/notifications/{id}/unread
 */
Route::post('/{id}/unread', function ($id) {
    $user = request()->user();
    $notification = \App\Models\Notification::where('user_id', $user->id)
        ->where('id', $id)
        ->firstOrFail();

    $notification->update([
        'status' => 'unread',
        'read_at' => null
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Notification marquée comme non lue'
    ]);
})->name('notifications.unread');

/**
 * Récupérer les notifications récentes (24h)
 * GET /api/notifications/recent
 */
Route::get('/recent', function () {
    $user = request()->user();
    $notifications = \App\Models\Notification::getRecent($user->id, 10);

    return response()->json([
        'success' => true,
        'data' => $notifications
    ]);
})->name('notifications.recent');

/**
 * Nettoyer les notifications expirées
 * POST /api/notifications/cleanup
 */
Route::post('/cleanup', function () {
    $deleted = \App\Models\Notification::deleteExpired();

    return response()->json([
        'success' => true,
        'message' => "Nettoyage terminé : {$deleted} notifications expirées supprimées",
        'deleted_count' => $deleted
    ]);
})->name('notifications.cleanup');
