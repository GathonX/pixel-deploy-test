<?php

// laravel-backend/routes/dashboardUser.php - Routes Dashboard Utilisateur

use App\Http\Controllers\DashboardUser\DashboardUserStatsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Dashboard User Routes
|--------------------------------------------------------------------------
|
| Routes pour les statistiques du dashboard utilisateur
| Préfixe automatique : /api/dashboard-user/
| Middleware : auth:sanctum (appliqué dans api.php)
|
| Endpoints disponibles :
| - GET /dashboard-user/stats : Statistiques complètes utilisateur
|
*/

/**
 * ✅ GROUPE PRINCIPAL : Statistiques Dashboard Utilisateur
 * Middleware : auth:sanctum (authentification requise)
 */
Route::middleware(['auth:sanctum'])->group(function () {
    
    /**
     * Statistiques complètes du dashboard utilisateur
     * GET /api/dashboard-user/stats
     * 
     * Retourne :
     * - Statistiques blog (posts, vues, likes, commentaires)
     * - Statistiques réseaux sociaux
     * - Engagement global
     * - Répartition du contenu (AI vs humain)
     * - Statistiques temporelles (semaine/mois)
     * - Croissance et tendances
     */
    Route::get('/stats', [DashboardUserStatsController::class, 'getUserStats'])
         ->name('dashboard-user.stats');
         
});