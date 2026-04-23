<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * 🛡️ MIDDLEWARE SÉCURISÉ : Protection routes email non vérifié
     * 
     * Ce middleware garantit que TOUS les utilisateurs connectés
     * doivent avoir vérifié leur email pour accéder aux routes protégées.
     * 
     * ✅ SÉCURISATIONS :
     * - Vérification stricte du statut email
     * - Logs de sécurité pour audit
     * - Messages d'erreur clairs
     * - Redirection intelligente
     * - Support API et Web
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // ✅ 1. VÉRIFICATION UTILISATEUR CONNECTÉ
        if (!$user) {
            Log::warning('⚠️ [EmailVerified] Tentative accès sans authentification', [
                'ip' => $request->ip(),
                'route' => $request->route()?->getName(),
                'url' => $request->fullUrl(),
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentification requise.',
                    'error_code' => 'AUTHENTICATION_REQUIRED',
                    'redirect_to' => '/login',
                ], 401);
            }

            return redirect('/login');
        }

        // ✅ 2. VÉRIFICATION EMAIL OBLIGATOIRE
        if ($user instanceof MustVerifyEmail && !$user->hasVerifiedEmail()) {
            
            Log::warning('⚠️ [EmailVerified] Accès refusé - Email non vérifié', [
                'user_id' => $user->id,
                'email' => $user->email,
                'route' => $request->route()?->getName(),
                'url' => $request->fullUrl(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // ✅ Réponse API JSON
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Votre adresse email doit être vérifiée pour accéder à cette ressource.',
                    'error_code' => 'EMAIL_VERIFICATION_REQUIRED',
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'email_verified_at' => null,
                        'verification_required' => true,
                    ],
                    'actions' => [
                        'verify_email_page' => '/verify-email',
                        'resend_verification' => '/api/email/verification-notification',
                        'logout' => '/api/logout',
                    ],
                    'instructions' => [
                        'step_1' => 'Vérifiez votre boîte email',
                        'step_2' => 'Cliquez sur le lien de vérification',
                        'step_3' => 'Connectez-vous après vérification',
                    ],
                ], 409); // 409 Conflict - Action requise
            }

            // ✅ Redirection Web avec paramètres
            $redirectUrl = '/verify-email?' . http_build_query([
                'email' => $user->email,
                'from' => 'access_denied',
                'intended' => $request->fullUrl(),
            ]);

            return redirect($redirectUrl);
        }

        // ✅ 3. LOGS DE SUCCÈS (pour audit)
        Log::info('✅ [EmailVerified] Accès autorisé', [
            'user_id' => $user->id,
            'email' => $user->email,
            'route' => $request->route()?->getName(),
            'verified_at' => $user->email_verified_at?->toDateTimeString(),
        ]);

        return $next($request);
    }
}