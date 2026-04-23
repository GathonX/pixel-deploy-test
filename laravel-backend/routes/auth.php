<?php

// routes/auth.php - RATE LIMITING AJUSTÉ

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\VerifyEmailController;

/*
|--------------------------------------------------------------------------
| API Routes Auth - RATE LIMITING AJUSTÉ
|--------------------------------------------------------------------------
|
| ✅ CORRECTION RATE LIMITING:
| - Login : Plus flexible pour UX normale
| - Sécurité maintenue contre brute force
| - Différenciation développement/production
|
*/

// ===== ROUTES PUBLIQUES AUTH =====

/**
 * ✅ ROUTE : Inscription (Rate limiting ajusté)
 */
Route::post('/register', [RegisteredUserController::class, 'store'])
    ->middleware(['guest', 'throttle:10,5'])  // ✅ AJUSTÉ: 10 tentatives/5 minutes
    ->name('register');

/**
 * ✅ ROUTE : Connexion (Rate limiting plus flexible)
 * 
 * ❌ ANCIEN : throttle:3,5 (trop strict)
 * ✅ NOUVEAU : Ajusté selon environnement
 */
Route::post('/login', [AuthenticatedSessionController::class, 'store'])
    ->middleware([
        'guest', 
        // ✅ DÉVELOPPEMENT : Plus permissif
        app()->environment(['local', 'testing']) 
            ? 'throttle:20,5'  // 20 tentatives/5 minutes en dev
            : 'throttle:10,5'  // 10 tentatives/5 minutes en prod
    ])
    ->name('login');

/**
 * ✅ ROUTE : Mot de passe oublié (Ajusté)
 */
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
    ->middleware(['guest', 'throttle:5,10']) // ✅ AJUSTÉ: 5 tentatives/10 minutes
    ->name('password.email');

/**
 * ✅ ROUTE : Réinitialisation mot de passe (Ajusté)
 */
Route::post('/reset-password', [NewPasswordController::class, 'store'])
    ->middleware(['guest', 'throttle:5,10']) // ✅ AJUSTÉ: 5 tentatives/10 minutes
    ->name('password.store');

/**
 * ✅ ROUTE : Vérifier le statut d'un email
 */
Route::post('/auth/check-email-status', [App\Http\Controllers\Auth\EmailStatusController::class, 'checkStatus'])
    ->middleware(['throttle:30,5']) // ✅ AJUSTÉ: 30 tentatives/5 minutes
    ->name('auth.check-email-status');

/**
 * ✅ ROUTE : Renvoyer email de vérification
 */
Route::post('/auth/resend-verification-email', [App\Http\Controllers\Auth\EmailStatusController::class, 'resendVerification'])
    ->middleware(['throttle:5,10']) // ✅ AJUSTÉ: 5 tentatives/10 minutes
    ->name('auth.resend-verification-email');

// ===== ROUTES PROTÉGÉES =====

/**
 * ✅ ROUTES : Authentification requise
 */
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Déconnexion (pas de rate limiting)
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
    
    // Récupération utilisateur connecté (rate limiting souple)
    Route::get('/user', function () {
        $user = auth()->user();

        // Même logique que le login : workspace_role = null si l'user possède son propre workspace
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

        return response()->json(array_merge($user->toArray(), [
            'workspace_role'    => $workspaceMember?->role,
            'workspace_site_id' => $workspaceMember?->site_id,
        ]));
    })->middleware('throttle:120,1') // ✅ 120 req/minute
      ->name('api.user');
    
    // Renvoi email de vérification (pour utilisateurs connectés)
    Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:3,10') // ✅ AJUSTÉ: 3 tentatives/10 minutes
        ->name('verification.send');
    
    // Vérification email via API
    Route::post('/email/verify', [VerifyEmailController::class, 'verifyWithToken'])
        ->middleware('throttle:10,5')  // ✅ AJUSTÉ: 10 tentatives/5 minutes
        ->name('api.verification.verify');
});

// ===== ROUTES DE MONITORING =====

/**
 * ✅ ROUTE : Health check (pas de rate limiting)
 */
Route::get('/auth/health', function () {
    try {
        $dbStatus = \Illuminate\Support\Facades\DB::connection()->getPdo() ? 'connected' : 'disconnected';
        
        return response()->json([
            'status' => 'healthy',
            'database' => $dbStatus,
            'version' => '3.0.0-secure',
            'workflow' => 'SÉCURISÉ ✅',
            'auto_login' => false,
            'security_level' => 'ENTERPRISE',
            'rate_limiting' => [
                'login_dev' => '20 per 5 minutes',
                'login_prod' => '10 per 5 minutes',
                'current_env' => app()->environment(),
            ],
            'timestamp' => now()->toDateTimeString(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'error' => $e->getMessage(),
            'timestamp' => now()->toDateTimeString(),
        ], 500);
    }
})->name('auth.health');

/**
 * ✅ ROUTE : Statut détaillé (rate limiting souple)
 */
Route::get('/auth/status', function () {
    return response()->json([
        'status' => 'Auth System - WORKFLOW SÉCURISÉ',
        'version' => '3.0.0-secure',
        'environment' => app()->environment(),
        'workflow' => [
            'inscription' => 'Email envoyé (expire 60 min)',
            'verification' => 'Valide email SANS auto-login',
            'redirection' => 'Page login avec message succès',
            'connexion' => 'Manuelle obligatoire',
            'dashboard' => 'Accès après login uniquement',
        ],
        'security_features' => [
            'auto_login' => false,
            'manual_login_required' => true,
            'email_expiry' => '60 minutes',
            'rate_limiting_adjusted' => true, // ✅ NOUVEAU
            'security_logging' => true,
            'onboarding_preserved' => true,
        ],
        'rate_limits_current' => [
            'environment' => app()->environment(),
            'login' => app()->environment(['local', 'testing']) ? '20 per 5 minutes' : '10 per 5 minutes',
            'registration' => '10 per 5 minutes',
            'forgot_password' => '5 per 10 minutes',
            'resend_verification' => '5 per 10 minutes',
            'email_status_check' => '30 per 5 minutes',
        ],
        'timestamp' => now()->toDateTimeString(),
    ]);
})->middleware('throttle:60,1') // ✅ 60 req/minute
  ->name('auth.status');

/*
|--------------------------------------------------------------------------
| ✅ CHANGEMENTS APPORTÉS
|--------------------------------------------------------------------------
|
| RATE LIMITING AJUSTÉ :
| - Login DEV : 20 tentatives/5 minutes (au lieu de 3)
| - Login PROD : 10 tentatives/5 minutes (au lieu de 3)
| - Register : 10 tentatives/5 minutes (au lieu de 5)
| - Email status : 30 tentatives/5 minutes (plus flexible)
| - User endpoint : 120 req/minute (très souple)
|
| ENVIRONNEMENT-SPÉCIFIQUE :
| - Développement : Limites plus souples pour les tests
| - Production : Limites modérées mais sécurisées
|
| SÉCURITÉ MAINTENUE :
| - Toujours protection contre brute force
| - Rate limiting adapté à l'usage réel
| - Logs de sécurité préservés
|
*/