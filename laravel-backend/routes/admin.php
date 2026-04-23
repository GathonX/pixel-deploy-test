<?php

use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminBlogController;
use App\Http\Controllers\Admin\AdminSocialMediaController;
use App\Http\Controllers\Admin\AdminSprintController;
use App\Http\Controllers\Admin\ChatPikMessageController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DashboardStatsController;
use App\Http\Controllers\Admin\TicketAdminController;
use App\Http\Controllers\Admin\UserAgentAdminController;
use App\Http\Controllers\AdminContentGenerationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        //
        // 1) User Agents
        //
        Route::get('user-agents', [UserAgentAdminController::class, 'index'])
            ->name('user-agents.index');
        Route::delete('user-agents/{id}', [UserAgentAdminController::class, 'destroy'])
            ->name('user-agents.destroy');

        //
        // 2) Dashboard & Stats généraux
        //
        Route::get('dashboard/user-growth', [DashboardController::class, 'userGrowth'])
            ->name('dashboard.userGrowth');
        Route::get('dashboard/stats', [DashboardStatsController::class, 'index'])
            ->name('dashboard.stats');
        Route::get('dashboard/recent-projects', [DashboardController::class, 'recentProjects'])
            ->name('dashboard.recentProjects');
        Route::get('dashboard/recent-tickets', [DashboardController::class, 'recentTickets'])
            ->name('dashboard.recentTickets');

        //
        // 3) Users CRUD + Stats spécifiques
        //
        Route::get('users', [AdminUserController::class, 'index'])
            ->name('users.index');
        Route::post('users', [AdminUserController::class, 'store'])
            ->name('users.store');
        // On expose la route stats AVANT la route users/{user}
        Route::get('users/stats', [AdminUserController::class, 'stats'])
            ->name('users.stats');

        // ✅ NOUVEAU : Routes pour voir les posts/sprints par utilisateur
        Route::get('users/{user}/social-posts', [AdminUserController::class, 'getSocialPosts'])
            ->name('users.social-posts');
        Route::get('users/{user}/blog-posts', [AdminUserController::class, 'getBlogPosts'])
            ->name('users.blog-posts');
        Route::get('users/{user}/sprints', [AdminUserController::class, 'getSprints'])
            ->name('users.sprints');

        Route::get('users/{user}', [AdminUserController::class, 'show'])
            ->name('users.show');
        Route::put('users/{user}', [AdminUserController::class, 'update'])
            ->name('users.update');
        Route::delete('users/{user}', [AdminUserController::class, 'destroy'])
            ->name('users.destroy');

        //
        // 4) Gestion des Blogs Admin
        //
        Route::prefix('blog')->name('blog.')->group(function () {
            // Statistiques générales des blogs
            Route::get('statistics', [AdminBlogController::class, 'statistics'])
                ->name('statistics');

            // Liste des utilisateurs pour sélection d'auteur
            Route::get('users', [AdminBlogController::class, 'getUsers'])
                ->name('users');

            // Upload d'image pour les articles
            Route::post('upload-image', [AdminBlogController::class, 'uploadImage'])
                ->name('upload-image');

            // CRUD des articles de blog
            Route::get('/', [AdminBlogController::class, 'index'])
                ->name('index');
            Route::post('/', [AdminBlogController::class, 'store'])
                ->name('store');
            Route::get('/{id}', [AdminBlogController::class, 'show'])
                ->name('show');
            Route::put('/{id}', [AdminBlogController::class, 'update'])
                ->name('update');
            Route::delete('/{id}', [AdminBlogController::class, 'destroy'])
                ->name('destroy');

            // Gestion des commentaires
            Route::get('/{id}/comments', [AdminBlogController::class, 'getComments'])
                ->name('comments.index');
            Route::delete('/comments/{commentId}', [AdminBlogController::class, 'deleteComment'])
                ->name('comments.destroy');
        });

        // ✅ NOUVEAU : Suppression individuelle de posts sociaux
        Route::delete('social-posts/{id}', [AdminSocialMediaController::class, 'destroy'])
            ->name('social-posts.destroy');

        // ✅ NOUVEAU : Suppression individuelle de sprints
        Route::delete('sprints/{id}', [AdminSprintController::class, 'destroy'])
            ->name('sprints.destroy');

        // ✅ NOUVEAU : Suppression des tâches d'un jour spécifique
        Route::delete('sprints/{sprintId}/tasks/day/{date}', [AdminSprintController::class, 'destroyDayTasks'])
            ->name('sprints.tasks.destroyDay');

        //
        // 5) Génération de Contenu Admin (Nouveau Système)
        //
        Route::prefix('')->name('content.')->group(function () {
            // Informations projet admin
            Route::get('project-info', [AdminContentGenerationController::class, 'getProjectInfo'])
                ->name('project-info.get');
            Route::post('project-info', [AdminContentGenerationController::class, 'saveProjectInfo'])
                ->name('project-info.save');

            // Objectifs hebdomadaires
            Route::get('weekly-objective/current', [AdminContentGenerationController::class, 'getCurrentWeekObjective'])
                ->name('objective.current');
            Route::post('weekly-objective/generate', [AdminContentGenerationController::class, 'generateWeeklyObjective'])
                ->name('objective.generate');

            // Génération des posts
            Route::post('generate-weekly-posts', [AdminContentGenerationController::class, 'generateWeeklyPosts'])
                ->name('posts.generate');

            // État de génération
            Route::get('generation-status', [AdminContentGenerationController::class, 'getGenerationStatus'])
                ->name('status');
        });

//Route pour la recuperation de chatPick
        Route::get('chat-pick-message', [ChatPikMessageController::class, 'index'])->name('chat-pick-message.index');
        Route::delete('chat-pick-message/{id}', [App\Http\Controllers\Admin\ChatPikMessageController::class, 'destroy'])
            ->name('chat-pick-message.destroy');
        Route::post('chat-pick-message/bulk-delete', [App\Http\Controllers\Admin\ChatPikMessageController::class, 'bulkDelete'])
            ->name('chat-pick-message.bulk-delete');


/**
 * ✅ NOUVELLE ROUTE : Statistiques financières détaillées
 * GET /api/admin/dashboard/finance-stats
 *
 * Utilise la méthode getFinanceStats() du DashboardStatsController
 * pour récupérer les vraies données basées sur FeatureActivationRequest
 */
Route::get('dashboard/finance-stats', [DashboardStatsController::class, 'getFinanceStats'])
    ->name('dashboard.finance-stats');

/**
 * ✅ NOUVELLE ROUTE : Liste complète des transactions
 * GET /api/admin/finance/transactions
 */
Route::get('finance/transactions', [DashboardStatsController::class, 'getTransactions'])
    ->name('finance.transactions');


// ===== GESTION DES FONCTIONNALITÉS =====
        Route::prefix('features')->name('features.')->group(function () {
            // Liste des fonctionnalités avec stats
            Route::get('/', [App\Http\Controllers\Admin\AdminFeatureController::class, 'index'])
                ->name('index');

            // Utilisateurs avec accès à une fonctionnalité
            Route::get('/{feature}/users', [App\Http\Controllers\Admin\AdminFeatureController::class, 'getUsersWithAccess'])
                ->name('users');

            // Activer l'accès pour un utilisateur
            Route::post('/enable-access', [App\Http\Controllers\Admin\AdminFeatureController::class, 'enableUserAccess'])
                ->name('enable-access');

            // Mettre à jour l'accès d'un utilisateur (admin_enabled, status, etc.)
            Route::put('/access/{access}', [App\Http\Controllers\Admin\AdminFeatureController::class, 'updateUserAccess'])
                ->name('update-access');

            // Révoquer l'accès d'un utilisateur
            Route::delete('/access/{access}', [App\Http\Controllers\Admin\AdminFeatureController::class, 'revokeUserAccess'])
                ->name('revoke-access');

            // Demandes d'activation en attente
            Route::get('/pending-requests', [App\Http\Controllers\Admin\AdminFeatureController::class, 'getPendingRequests'])
                ->name('pending-requests');

            // Approuver une demande
            Route::post('/requests/{request}/approve', [App\Http\Controllers\Admin\AdminFeatureController::class, 'approveRequest'])
                ->name('approve-request');

            // Rejeter une demande
            Route::post('/requests/{request}/reject', [App\Http\Controllers\Admin\AdminFeatureController::class, 'rejectRequest'])
                ->name('reject-request');

            // ✅ NOUVEAU : Supprimer définitivement un ancien achat
            Route::delete('/purchase/{access}', [App\Http\Controllers\Admin\AdminFeatureController::class, 'deletePurchase'])
                ->name('delete-purchase');
        });

    });

// Protection des routes tickets par le middleware 'admin'
Route::middleware(['auth:sanctum', 'admin'])
    ->prefix('admin/tickets')
    ->name('admin.tickets.')
    ->group(function () {
        // ✅ NOUVEAU : Route statistiques (avant les routes avec paramètres)
        Route::get('stats', [TicketAdminController::class, 'getStats'])
            ->name('stats');
        
        // ✅ NOUVEAU : Routes templates
        Route::get('templates', [TicketAdminController::class, 'getTemplates'])
            ->name('templates.index');
        Route::post('templates/{template}/use', [TicketAdminController::class, 'useTemplate'])
            ->name('templates.use');
        
        // ✅ NOUVEAU : Routes assignation
        Route::get('admins', [TicketAdminController::class, 'getAdmins'])
            ->name('admins.index');
        Route::post('{ticket}/assign', [TicketAdminController::class, 'assignTicket'])
            ->name('assign');
            
        Route::get('', [TicketAdminController::class, 'index'])
            ->name('index');
        Route::get('{ticket}', [TicketAdminController::class, 'show'])
            ->name('show');
        Route::put('{ticket}', [TicketAdminController::class, 'update'])
            ->name('update');
        Route::get('{ticket}/messages', [TicketAdminController::class, 'messages'])
            ->name('messages.index');
        Route::post('{ticket}/messages', [TicketAdminController::class, 'storeMessage'])
            ->name('messages.store');
        // ✅ NOUVEAU : Historique des modifications du ticket
        Route::get('{ticket}/history', [TicketAdminController::class, 'history'])
            ->name('history.index');
        Route::delete('{ticket}', [TicketAdminController::class, 'destroy'])
            ->name('destroy');
    });

// ===== GÉNÉRATION DE CONTENU ADMIN =====
Route::middleware(['auth:sanctum', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        // Informations projet admin
        Route::get('content-generation/project-info', [AdminContentGenerationController::class, 'getProjectInfo'])
            ->name('content-generation.project-info');
        Route::post('content-generation/project-info', [AdminContentGenerationController::class, 'saveProjectInfo'])
            ->name('content-generation.save-project-info');

        // Objectif hebdomadaire
        Route::get('content-generation/current-objective', [AdminContentGenerationController::class, 'getCurrentWeekObjective'])
            ->name('content-generation.current-objective');
        Route::post('content-generation/generate-objective', [AdminContentGenerationController::class, 'generateWeeklyObjective'])
            ->name('content-generation.generate-objective');

        // Génération posts (PROGRESSIF: 1er post immédiat + reste en arrière-plan)
        Route::post('generate-weekly-posts', [AdminContentGenerationController::class, 'generateWeeklyPosts'])
            ->name('generate-weekly-posts');

        // 🎯 Polling pour suivre la progression (format compatible avec ProgressiveLoadingModal)
        Route::get('job-status', [AdminContentGenerationController::class, 'getJobStatus'])
            ->name('job-status');

        // Vérifier progression génération
        Route::get('generation-progress', [AdminContentGenerationController::class, 'checkGenerationProgress'])
            ->name('generation-progress');

        // Statut génération
        Route::get('generation-status', [AdminContentGenerationController::class, 'getGenerationStatus'])
            ->name('generation-status');
    });
