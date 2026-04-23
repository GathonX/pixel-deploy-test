<?php

// laravel-backend/routes/api.php - VERSION AVEC BLOG & SOCIAL MEDIA

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\{ChangePasswordController, EmailVerificationNotificationController};
use App\Http\Controllers\API\{OpenAIController, ContentCalendarController};
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\UserFeatureController;
use App\Http\Resources\ImageResource;

/*
|--------------------------------------------------------------------------
| API Routes - VERSION AVEC BLOG & SOCIAL MEDIA
|--------------------------------------------------------------------------
*/

// ===== SANTÉ DE L'API =====

// ✅ ENDPOINT VERSION - Pour invalidation cache frontend
Route::get('version', function () {
    return response()->json([
        'version' => config('app.version', '1.0.0'),
        'deployed_at' => now()->toISOString(),
        'environment' => app()->environment(),
    ]);
});

Route::get('health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'API Laravel Backend - Opérationnel',
        'timestamp' => now()->toISOString(),
        'version' => config('app.version', '1.0.0'),
        'environment' => app()->environment(),
        'modules' => [
            'auth' => 'active',
            'profile' => 'active',
            'projects' => 'active',
            'admin' => 'active',
            'tickets' => 'active',
            'tracking' => 'active',
            'notifications' => 'active',    // ✅ AJOUTÉ
            'blog' => 'active',
            'social_media' => 'active',
            'interactions' => 'active',
            'categories' => 'active',
        ],
    ]);
});

// ===== ROUTES PUBLIQUES =====

// Tracking utilisateur
Route::match(['GET', 'POST'], 'tracking/consent', [TrackingController::class, 'setConsent'])
    ->name('api.tracking.consent');

// Images publiques
Route::get('images', function (Request $request) {
    $images = collect([
        ['url' => 'https://images.unsplash.com/photo-1518837695005-2083093ee35b', 'alt' => 'Image 1'],
        ['url' => 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', 'alt' => 'Image 2'],
        ['url' => 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', 'alt' => 'Image 3'],
    ]);
    return ImageResource::collection($images);
})->name('api.images');

// ✅ RESERVATIONS - Routes mixtes (public + protégé)
Route::prefix('reservations')->group(function () {
    require __DIR__ . '/reservations.php';
});

// ===== CONTACT IFRAME =====

// Route publique pour soumission de formulaire de contact (iframe)
Route::post('/contact', [\App\Http\Controllers\API\ContactController::class, 'store'])
    ->middleware('throttle:5,10')
    ->name('api.contact.store');

// Routes dashboard protégées pour gestion des contacts
Route::prefix('contacts/dashboard')->group(function () {
    Route::get('/', [\App\Http\Controllers\API\ContactController::class, 'getDashboardContacts'])->name('api.contacts.dashboard');
    Route::get('/stats', [\App\Http\Controllers\API\ContactController::class, 'getDashboardStats'])->name('api.contacts.dashboard.stats');
    Route::get('/{id}', [\App\Http\Controllers\API\ContactController::class, 'getDashboardContactDetails'])->name('api.contacts.dashboard.details');
    Route::put('/{id}/status', [\App\Http\Controllers\API\ContactController::class, 'updateContactStatus'])->name('api.contacts.dashboard.status');
});


// ===== ROUTES PROTÉGÉES =====

Route::middleware('auth:sanctum')->group(function () {

    // Profil utilisateur
    Route::get('/user', function (Request $request) {
        $user = $request->user();

        // Déterminer workspace_role et workspace_site_id (même logique que le login)
        $ownsWorkspace = \App\Models\Workspace::where('owner_user_id', $user->id)
            ->whereNotIn('status', ['deleted', 'pending_deletion'])
            ->exists();

        $workspaceMember = null;
        if (!$ownsWorkspace) {
            $workspaceMember = \App\Models\WorkspaceUser::where('user_id', $user->id)
                ->whereIn('role', ['member', 'admin', 'client'])
                ->orderBy('joined_at', 'desc')
                ->first();
        }

        return array_merge($user->toArray(), [
            'workspace_role'    => $workspaceMember?->role,
            'workspace_site_id' => $workspaceMember?->site_id,
        ]);
    });

    // Changement de mot de passe
    Route::put('/password', [ChangePasswordController::class, 'update'])
        ->name('api.password.update');

    // ✅ NOTIFICATIONS - Routes complètes séparées
    Route::prefix('notifications')->group(function () {
        require __DIR__ . '/notifications.php';
    });

    // Vérification email
    Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('/users/{user}/profile', function ($userId) {
        $user = \App\Models\User::find($userId);
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email
        ]);

    });

    // ✅ PROFILE - Routes complètes séparées
    require __DIR__ . '/profile.php';

    // OpenAI — gating plan Pro/Premium requis
    Route::prefix('openai')->middleware('ai.plan')->group(function () {
        Route::post('/generate-text', [OpenAIController::class, 'generateText'])->name('api.openai.generate-text');
        Route::post('/generate-image', [OpenAIController::class, 'generateImage'])->name('api.openai.generate-image');
        Route::post('/analyze-text', [OpenAIController::class, 'analyzeText'])->name('api.openai.analyze-text');
    });

    // Projets & Tasks (existant dans api.php original)
    Route::apiResource('projects', \App\Http\Controllers\API\ProjectController::class);

    // ===== SPRINTS & TASKS (Pro feature) =====

    // Sprints : fonctionnalité Pro — requiert plan site 'pro' ou workspace 'premium'
    Route::prefix('sprints')->middleware('pro.feature')->group(function () {
        Route::get('/current', [\App\Http\Controllers\API\SprintController::class, 'getCurrentSprint'])->name('api.sprints.current');
        Route::get('/latest', [\App\Http\Controllers\API\SprintController::class, 'getLatestSprint'])->name('api.sprints.latest');
        Route::post('/generate', [\App\Http\Controllers\API\SprintController::class, 'generateSprint'])->name('api.sprints.generate');
        Route::post('/fix-access-ids', [\App\Http\Controllers\API\SprintController::class, 'fixExistingSprintsAccessIds'])->name('api.sprints.fix-access-ids');
        Route::post('/tasks/daily', [\App\Http\Controllers\API\SprintController::class, 'generateDailyTasks'])->name('api.sprints.tasks.daily');
        Route::put('/tasks/{id}/status', [\App\Http\Controllers\API\SprintController::class, 'updateTaskStatus'])->name('api.sprints.tasks.status');
        Route::post('/tasks/reorder', [\App\Http\Controllers\API\SprintController::class, 'reorderTasks'])->name('api.sprints.tasks.reorder');
    });

    // Support / Tickets (routes protégées)
    Route::prefix('tickets')->group(function () {
        require __DIR__ . '/tickets.php';
    });

    // Administration (routes protégées + middleware admin)
     require __DIR__ . '/admin.php';


     // ===== 🎯 SYSTÈME DE FONCTIONNALITÉS =====
    Route::prefix('features')->group(function () {
        require __DIR__ . '/features.php';
    });

    // ===== 🎯 SYSTÈME D'OBJECTIFS HEBDOMADAIRES =====
    Route::prefix('weekly-objectives')->group(function () {
        require __DIR__ . '/weeklyObjectives.php';
    });

    // ===== 🤖 AGENT INTELLIGENT UNIVERSEL =====
    Route::prefix('intelligent-agent')->group(function () {
        Route::get('/status', [App\Http\Controllers\UniversalAgentController::class, 'status']);
        Route::post('/interact', [App\Http\Controllers\UniversalAgentController::class, 'interact']);
        Route::get('/poll/{interactionId}', [App\Http\Controllers\UniversalAgentController::class, 'poll']);
        Route::post('/contextual-insights', [App\Http\Controllers\UniversalAgentController::class, 'getContextualInsights']);
        Route::post('/domain-recommendations', [App\Http\Controllers\UniversalAgentController::class, 'getDomainRecommendations']);
        Route::get('/global-context', [App\Http\Controllers\UniversalAgentController::class, 'getGlobalContext']);
        Route::post('/update-context', [App\Http\Controllers\UniversalAgentController::class, 'updateContext']);
        Route::post('/analyze-activity', [App\Http\Controllers\UniversalAgentController::class, 'analyzeUserActivity']);
        Route::get('/capabilities', [App\Http\Controllers\UniversalAgentController::class, 'getAgentCapabilities']);

        // ===== 🤖 PROACTIF & ACTIONS =====
        Route::get('/proactive-alerts', [App\Http\Controllers\UniversalAgentController::class, 'getProactiveAlerts']);
        Route::post('/execute-action',  [App\Http\Controllers\UniversalAgentController::class, 'executeAction']);

        // ===== 🎛️ PARAMÈTRES AGENT =====
        Route::prefix('settings')->group(function () {
            Route::get('/', [App\Http\Controllers\AgentSettingsController::class, 'getSettings']);
            Route::put('/', [App\Http\Controllers\AgentSettingsController::class, 'updateSettings']);
            Route::post('/reset', [App\Http\Controllers\AgentSettingsController::class, 'resetSettings']);
            Route::get('/export', [App\Http\Controllers\AgentSettingsController::class, 'exportSettings']);
            Route::get('/history', [App\Http\Controllers\AgentSettingsController::class, 'getSettingsHistory']);
        });

        // ===== 🧪 TEST ENDPOINTS (développement) =====
        if (app()->environment(['local', 'testing', 'development'])) {
            Route::prefix('test')->group(function () {
                Route::get('/diagnose', [App\Http\Controllers\TestAgentController::class, 'diagnose']);
                Route::post('/create-agent', [App\Http\Controllers\TestAgentController::class, 'createAgent']);
                Route::post('/create-preferences', [App\Http\Controllers\TestAgentController::class, 'createPreferences']);
            });
        }
    });

});

// Chat Assistant Routes

// ===== INCLUSION DIRECTE DES MODULES EXISTANTS =====

// ===== MODULES MIXTES (PUBLIC + PROTÉGÉ) =====

// ✅ UTILISATEURS - Profils et statistiques d'auteurs
require __DIR__ . '/users.php';

// ✅ BLOG POSTS - Routes protégées et publiques
require __DIR__ . '/blog.php';

// ✅ SOCIAL MEDIA POSTS - Routes protégées et publiques
require __DIR__ . '/social.php';

// ✅ INTERACTIONS - Likes, commentaires, vues, partages
require __DIR__ . '/interactions.php';

// ✅ MODÉRATION - Signalements, blocage, masquage, préférences
require __DIR__ . '/moderation.php';

// ✅ CATÉGORIES - Gestion et découverte de contenu
require __DIR__ . '/categories.php';

// ✅ FOLLOW - Suivre et ne plus suivre , abonné et désabonné
require __DIR__ . '/follow.php';


// ✅ EMBED - Routes pour intégration sur sites clients (PUBLIQUES)
require __DIR__ . '/embed.php';

//Generation auto posts
require __DIR__ . '/contentGeneration.php';


// Authentification - Routes mixtes (login public, logout protégé)
require __DIR__ . '/auth.php';

// ===== DASHBOARD USER =====
// Dashboard User Statistics (routes protégées)
Route::prefix('dashboard-user')->group(function () {
    require __DIR__ . '/dashboardUser.php';
});

// ===== ROUTE TEST LOGIN SIMPLE =====
Route::post('/test-login', function (\Illuminate\Http\Request $request) {
    try {
        $email = $request->input('email');
        $password = $request->input('password');
        
        $user = \App\Models\User::where('email', $email)->first();
        
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        
        if (!\Illuminate\Support\Facades\Hash::check($password, $user->password)) {
            return response()->json(['error' => 'Invalid password'], 401);
        }
        
        // Connexion sans sessions complexes
        \Illuminate\Support\Facades\Auth::login($user);
        
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'message' => 'Connexion réussie'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => basename($e->getFile())
        ], 500);
    }
});

// ===== DÉVELOPPEMENT SEULEMENT =====

if (app()->environment(['local', 'testing', 'development', 'staging'])) {

    // Test Redis connection
    Route::get('/test-redis', function () {
        try {
            $redis = \Illuminate\Support\Facades\Redis::connection();
            $redis->set('test_key', 'Hello Redis from Laravel!');
            $value = $redis->get('test_key');

            return response()->json([
                'status' => 'success',
                'message' => 'Redis is working!',
                'test_value' => $value,
                'redis_client' => config('database.redis.client'),
                'redis_host' => config('database.redis.default.host'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'redis_client' => config('database.redis.client'),
            ], 500);
        }
    })->name('api.test.redis');

    // Debug tracking consent
    Route::get('/debug-track-consent', function () {
        return response()->json([
            'session_id' => session()->getId(),
            'tracking_consent' => session()->get('tracking_consent', null),
            'environment' => app()->environment(),
        ]);
    })->name('api.debug.tracking');

    // Tests de développement (uniquement si nécessaire)
    if (file_exists(__DIR__ . '/test.php')) {
        require __DIR__ . '/test.php';
    }

    // Debug routes (routes de débogage)
    if (file_exists(__DIR__ . '/debug.php')) {
        require __DIR__ . '/debug.php';
    }

}

// Monitoring système (si le module existe)
if (file_exists(__DIR__ . '/health.php')) {
    require __DIR__ . '/health.php';
}

// ❌ SUPPRIMÉ : Inclusion dupliquée de funnel-crm.php
// Routes Funnel-CRM maintenant incluses dans le middleware auth:sanctum

// ✅ NOUVEAU : Calendrier unifié (Blog + Social Media)
Route::middleware('auth:sanctum')->prefix('content')->group(function () {
    /**
     * GET /api/content/calendar
     * Récupère tous les contenus (blog + social media) pour le calendrier
     * Paramètres: ?year=2025&month=10&type=all&status=all
     */
    Route::get('/calendar', [ContentCalendarController::class, 'index'])
         ->name('content.calendar');
});

// ✅ MARKETPLACE - Routes complètes séparées
require __DIR__ . '/marketplace.php';

// ✅ STUDIO DOMAINE - Gestion des noms de domaine
require __DIR__ . '/studio-domaine.php';

// ✅ SITE BUILDER - Constructeur de sites web
require __DIR__ . '/site-builder.php';

// ✅ WORKSPACE - Gestion workspace et gating plan
require __DIR__ . '/workspace.php';

// ✅ PURCHASES - Système d'achat générique (site-builder, studio-domain, marketplace)
require __DIR__ . '/purchases.php';

// ✅ BOOKING - Gestion réservations, produits, fournisseurs, CGV
require __DIR__ . '/booking.php';

// ✅ INVITATIONS - Routes publiques (validate + accept token)
Route::prefix('invitation')->group(function () {
    Route::get('/accept/{token}', [\App\Http\Controllers\API\WorkspaceInvitationController::class, 'validateToken']);
    Route::post('/accept/{token}', [\App\Http\Controllers\API\WorkspaceInvitationController::class, 'accept']);
});
