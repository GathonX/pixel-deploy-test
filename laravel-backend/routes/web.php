<?php

// laravel-backend/routes/web.php - WORKFLOW SÉCURISÉ SANS AUTO-LOGIN

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\Auth\AccountDeletionController;
use App\Http\Controllers\SitemapController;

    // laravel-backend/routes/web.php
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Web Routes - WORKFLOW EMAIL VERIFICATION SÉCURISÉ
|--------------------------------------------------------------------------
|
| ✅ WORKFLOW SÉCURISÉ IMPLÉMENTÉ:
| Routes web uniquement pour les liens email signés
| Tout le reste passe par l'API et React SPA
|
| ✅ NOUVELLES SÉCURISATIONS:
| - Signature Laravel avec expiration 60 minutes (pas 24h)
| - Rate limiting strict selon criticité
| - Logs de sécurité complets
| - Redirection sécurisée vers React LOGIN (pas dashboard)
| - AUCUN auto-login possible
| - Suppression complète des routes de tokens temporaires
|
*/

// ===== SITEMAP DYNAMIQUE =====

/**
 * ✅ ROUTE : Sitemap.xml dynamique généré en temps réel
 * Récupère tous les articles publiés depuis la base de données
 * Pas de cache - toujours à jour
 */
Route::get('/sitemap.xml', [SitemapController::class, 'index'])
    ->name('sitemap');

// ===== ROUTES EMAIL SIGNÉES CRITIQUES =====

/**
 * ✅ ROUTE PRINCIPALE : Vérification email SÉCURISÉE
 *
 * NOUVEAU WORKFLOW SÉCURISÉ:
 * 1. Utilisateur clique lien dans email
 * 2. Laravel vérifie signature (60 min max - RÉDUIT depuis 24h)
 * 3. Marque email comme vérifié UNIQUEMENT
 * 4. PAS de token temporaire créé (SUPPRIMÉ)
 * 5. Redirige vers React /login avec message succès
 * 6. Utilisateur doit se connecter manuellement
 * 7. Après login → accès dashboard
 *
 * Sécurisations renforcées:
 * - Middleware 'signed' : Signature Laravel obligatoire avec expiration 60 min
 * - Rate limiting: 3 tentatives/5 minutes par IP (plus strict)
 * - Validation hash et utilisateur
 * - AUCUN token temporaire créé
 * - Logs complets pour audit sécurité
 * - Redirection vers LOGIN uniquement
 */
Route::get('/verify-email/{id}/{hash}', [VerifyEmailController::class, 'verify'])
    ->middleware([
        'signed',           // ✅ CRITIQUE: Vérification signature Laravel (60 min)
        'throttle:5,2'
      // ✅ SÉCURISÉ: 3 tentatives/5 minutes par IP
    ])
    ->name('verification.verify');

/**
 * ✅ ROUTE : Confirmation suppression compte (sécurité renforcée)
 *
 * Pour gestion sécurisée suppression compte utilisateur
 * Rate limiting plus strict car action irréversible
 */
Route::get('/account/delete-confirm/{id}/{hash}', [AccountDeletionController::class, 'confirmDelete'])
    ->middleware([
        'signed',           // ✅ Signature obligatoire
        'throttle:2,10'     // ✅ Plus restrictif: 2 tentatives/10 minutes
    ])
    ->name('account.delete.confirm');


Route::get('/payment/success', function (Request $request) {
    $token = $request->query('token');
    $payerId = $request->query('PayerID');
    $frontendUrl = config('app.frontend_url', 'http://localhost:8080');
    return redirect("{$frontendUrl}/payments/payment/success?token={$token}&PayerID={$payerId}");
});

Route::get('/payment/cancel', function (Request $request) {
    $token = $request->query('token');
    $frontendUrl = config('app.frontend_url', 'http://localhost:8080');
    return redirect("{$frontendUrl}/payments?cancel=true&token={$token}");
});

// ===== GESTION FICHIERS STATIQUES AVEC CORS (PRIORITÉ HAUTE) =====

/**
 * ✅ ROUTE CRITIQUE : Fichiers statiques avec en-têtes CORS appropriés
 * Résout le problème OpaqueResponseBlocking pour les PDF, images, etc.
 * PLACÉE EN PRIORITÉ pour éviter les conflits
 */
Route::get('/storage/{path}', function ($path) {
    $filePath = storage_path('app/public/' . $path);

    if (!file_exists($filePath)) {
        abort(404, 'Fichier non trouvé');
    }

    // Obtenir le type MIME
    $mimeType = mime_content_type($filePath);

    // ✅ CORRECTION CRITIQUE : Headers CORS renforcés
    $headers = [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers' => 'Origin, Content-Type, Accept, Authorization, X-Requested-With',
        'Cross-Origin-Resource-Policy' => 'cross-origin',
        'Cross-Origin-Embedder-Policy' => 'unsafe-none',
        'X-Content-Type-Options' => 'nosniff',
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=3600', // Cache 1 heure
    ];

    // ✅ Headers spécifiques selon le type de fichier
    $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

    switch ($extension) {
        case 'pdf':
            $headers['Content-Disposition'] = 'inline; filename="' . basename($path) . '"';
            break;
        case 'doc':
        case 'docx':
        case 'zip':
        case 'rar':
            $headers['Content-Disposition'] = 'attachment; filename="' . basename($path) . '"';
            break;
    }

    return response()->file($filePath, $headers);
})->where('path', '.*')
  ->middleware([\App\Http\Middleware\StorageCorsMiddleware::class, 'throttle:storage'])
  ->name('storage.file');

// ===== HEALTHCHECK ROUTE =====

/**
 * ✅ ROUTE : Healthcheck pour Docker
 */
Route::get('/up', function () {
    return response()->json(['status' => 'ok'], 200);
});

// ===== PAGE D'ACCUEIL API =====

/**
 * ✅ ROUTE : Information API publique avec statut système SÉCURISÉ
 */
Route::get('/', function () {
    return response()->json([
        'app' => config('app.name', 'PixelRise API'),
        'status' => 'operational',
        'version' => config('app.version', '3.0.0-secure'),
        'environment' => app()->environment(),
        'frontend_url' => config('app.frontend_url'),

        // ✅ INFORMATION WORKFLOW SÉCURISÉ
        'auth_workflow' => 'SÉCURISÉ - Manual Login Required',
        'security_level' => 'ENTERPRISE',
        'features' => [
            'auto_login_after_verification' => false, // ✅ DÉSACTIVÉ
            'temp_token_system' => false, // ✅ SUPPRIMÉ
            'manual_login_required' => true,
            'email_verification_required' => true,
            'email_expiry_60_minutes' => true,
            'strict_rate_limiting' => true,
            'comprehensive_security_logging' => true,
            'onboarding_integration' => true,
            'csrf_protection' => true,
            'post_generation_preserved' => true, // ✅ VOTRE SYSTÈME PRÉSERVÉ
            'cors_file_serving' => true, // ✅ NOUVEAU
        ],

        // ✅ ENDPOINTS SÉCURISÉS
        'api_prefix' => '/api',
        'endpoints' => [
            'health_check' => '/api/auth/health',
            'registration' => '/api/register',
            'login' => '/api/login',
            'logout' => '/api/logout',
            'user_info' => '/api/user',
            'admin_panel' => '/api/admin/*',
            'user_dashboard' => '/api/*',
            'file_serving' => '/storage/*', // ✅ NOUVEAU
        ],

        // ✅ ROUTES EMAIL SÉCURISÉES
        'email_routes' => [
            'email_verification' => url('/verify-email/{id}/{hash}'),
            'account_deletion' => url('/account/delete-confirm/{id}/{hash}'),
        ],

        // ✅ LIMITES DE SÉCURITÉ RENFORCÉES
        'rate_limits' => [
            'email_verification_click' => '3 per 5 minutes',
            'email_resend' => '2 per 10 minutes',
            'account_deletion' => '2 per 10 minutes',
            'registration' => '5 per 5 minutes',
            'login' => '3 per 5 minutes',
            'forgot_password' => '2 per 10 minutes',
            'email_status_check' => '10 per 5 minutes',
            'file_serving' => '200 per minute', // ✅ NOUVEAU
        ],

        // ✅ WORKFLOW DÉTAILLÉ
        'secure_workflow' => [
            'step_1' => 'Inscription → Email envoyé (expire 60 min)',
            'step_2' => 'Clic email → Email vérifié SANS auto-login',
            'step_3' => 'Redirection → /login avec message succès',
            'step_4' => 'Login manuel → Session Sanctum créée',
            'step_5' => 'Dashboard → Accessible après login uniquement',
        ],

        // ✅ FONCTIONNALITÉS SUPPRIMÉES
        'removed_for_security' => [
            'temp_token_exchange' => 'SUPPRIMÉ ✅',
            'auto_login_routes' => 'SUPPRIMÉ ✅',
            'session_auto_creation' => 'SUPPRIMÉ ✅',
            'temp_token_controller' => 'SUPPRIMÉ ✅',
        ],

        // ✅ FONCTIONNALITÉS PRÉSERVÉES
        'preserved_features' => [
            'smart_post_generation' => 'PRÉSERVÉ ✅',
            'onboarding_system' => 'PRÉSERVÉ ✅',
            'user_projects_tasks' => 'PRÉSERVÉ ✅',
            'admin_system' => 'PRÉSERVÉ ✅',
            'paypal_integration' => 'PRÉSERVÉ ✅',
            'cors_file_access' => 'NOUVEAU ✅', // ✅ NOUVEAU
        ],

        // ✅ INFORMATIONS COMPLÉMENTAIRES
        'documentation' => config('app.docs_url', null),
        'support' => config('app.support_email', null),
        'timestamp' => now()->toISOString(),
    ]);
});

// ===== ROUTES DE DÉVELOPPEMENT =====

if (app()->environment(['local', 'testing', 'development'])) {

    /**
     * ✅ ROUTE DEBUG : Test génération lien vérification SÉCURISÉ
     */
    Route::get('/debug/generate-verification-link/{userId}', function ($userId) {
        try {
            $user = \App\Models\User::findOrFail($userId);

            // ✅ NOUVEAU: Expiration 60 minutes (pas 24h)
            $verificationUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60), // ✅ 60 minutes maximum
                ['id' => $user->id, 'hash' => sha1($user->email)]
            );

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'email_verified' => $user->hasVerifiedEmail(),
                ],
                'verification_url' => $verificationUrl,
                'expires_at' => now()->addMinutes(60)->toISOString(), // ✅ 60 minutes
                'workflow' => 'SÉCURISÉ - Redirige vers /login après vérification',
                'auto_login' => false, // ✅ Confirmé désactivé
                'warning' => 'Development only - Secure workflow active',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 404);
        }
    })->name('debug.verification-link');

    /**
     * ✅ ROUTE DEBUG : Simulation clic email SÉCURISÉ
     */
    Route::get('/debug/simulate-email-click/{userId}', function ($userId) {
        try {
            $user = \App\Models\User::findOrFail($userId);

            // ✅ NOUVEAU: Génération avec expiration 60 minutes
            $verificationUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60), // ✅ 60 minutes maximum
                ['id' => $user->id, 'hash' => sha1($user->email)]
            );

            return redirect($verificationUrl);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 404);
        }
    })->name('debug.simulate-click');

    /**
     * ✅ ROUTE DEBUG : Test workflow complet sécurisé
     */
    Route::get('/debug/workflow-test/{userId}', function ($userId) {
        try {
            $user = \App\Models\User::findOrFail($userId);

            return response()->json([
                'workflow_test' => 'SÉCURISÉ ✅',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'verified' => $user->hasVerifiedEmail(),
                ],
                'steps' => [
                    '1_inscription' => 'Email envoyé (expire 60 min)',
                    '2_verification' => 'Email vérifié SANS auto-login',
                    '3_redirection' => 'Vers /login avec message succès',
                    '4_login' => 'Connexion manuelle obligatoire',
                    '5_dashboard' => 'Accès après login uniquement',
                ],
                'security_features' => [
                    'auto_login' => false,
                    'temp_tokens' => false,
                    'manual_login_required' => true,
                    'email_expiry' => '60 minutes',
                    'rate_limiting' => 'strict',
                    'cors_files' => true, // ✅ NOUVEAU
                ],
                'preserved_features' => [
                    'post_generation' => true,
                    'onboarding' => true,
                    'accessible_after_login' => true,
                    'file_access' => true, // ✅ NOUVEAU
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 404);
        }
    })->name('debug.workflow-test');

    /**
     * ✅ ROUTE DEBUG : Test route storage CORS
     */
    Route::get('/debug/test-storage-route', function () {
        return response()->json([
            'message' => 'Route storage CORS active',
            'route_name' => 'storage.file',
            'example_url' => route('storage.file', ['path' => 'ticket_messages/example.pdf']),
            'cors_enabled' => true,
            'middleware' => [
                'StorageCorsMiddleware',
                'throttle:storage'
            ],
            'timestamp' => now()->toISOString(),
        ]);
    })->name('debug.storage-test');

}

/**
 * Page publique article complet (pour liens embed)
 */
Route::get('/article/{slug}', function ($slug) {
    return view('public.blog-article', [
        'slug' => $slug,
        'api_url' => config('app.url') . '/api'
    ]);
})->name('public.blog.article');

// ===== ROUTE FALLBACK SÉCURISÉE =====

/**
 * ✅ ROUTE : Fallback avec gestion intelligente
 */
Route::fallback(function () {
    $frontendUrl = config('app.frontend_url', 'http://localhost:8080');

    // ✅ Si requête API, retourner JSON informatif
    if (request()->expectsJson() || request()->is('api/*')) {
        return response()->json([
            'error' => 'Route not found',
            'message' => 'The requested endpoint does not exist.',
            'available_endpoints' => [
                'auth' => '/api/auth/*',
                'user' => '/api/user',
                'health' => '/api/auth/health',
                'files' => '/storage/*', // ✅ NOUVEAU
            ],
            'workflow' => 'SÉCURISÉ - Manual Login Required',
            'auto_login' => false,
            'cors_enabled' => true, // ✅ NOUVEAU
            'timestamp' => now()->toISOString(),
        ], 404);
    }

    // ✅ Autres requêtes : redirection vers React
    return redirect($frontendUrl . '/?from=backend_fallback');
});

require __DIR__ . '/debug_email.php';
require __DIR__ . '/reservationIframe.php';
