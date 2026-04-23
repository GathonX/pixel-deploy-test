<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class EmailVerificationNotificationController extends Controller
{
    /**
     * ✅ OPTION 2: Renvoi d'email de vérification avec rate limiting strict
     * 
     * Sécurisations:
     * - Rate limiting: 3 tentatives par heure maximum
     * - Logs de sécurité pour surveillance
     * - Vérification du statut de vérification
     * - Gestion d'erreurs robuste
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        try {
            $user = $request->user();

            // ✅ 1. LOGS DE SÉCURITÉ - TENTATIVE RENVOI
            Log::info('📧 [EmailResend] Tentative de renvoi d\'email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toISOString(),
            ]);

            // ✅ 2. VÉRIFICATION SI DÉJÀ VÉRIFIÉ
            if ($user->hasVerifiedEmail()) {
                Log::info('ℹ️ [EmailResend] Email déjà vérifié - redirection dashboard', [
                    'user_id' => $user->id,
                    'verified_at' => $user->email_verified_at,
                ]);

                // Si requête web, rediriger vers dashboard
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Votre email est déjà vérifié.',
                        'redirect_to' => '/dashboard',
                        'already_verified' => true,
                    ]);
                } else {
                    return redirect()->intended('/dashboard');
                }
            }

            // ✅ 3. RATE LIMITING STRICT (3 tentatives par heure)
            $rateLimitKey = 'email-resend:' . $user->id;
            $maxAttempts = 3;
            $decayMinutes = 60; // 1 heure

            if (RateLimiter::tooManyAttempts($rateLimitKey, $maxAttempts)) {
                $availableIn = RateLimiter::availableIn($rateLimitKey);
                
                Log::warning('⚠️ [EmailResend] Rate limit atteint', [
                    'user_id' => $user->id,
                    'ip' => $request->ip(),
                    'attempts' => RateLimiter::attempts($rateLimitKey),
                    'available_in_seconds' => $availableIn,
                ]);

                throw ValidationException::withMessages([
                    'email' => [
                        'Trop de tentatives de renvoi. ' . 
                        'Veuillez attendre ' . ceil($availableIn / 60) . ' minutes avant de réessayer.'
                    ]
                ]);
            }

            // ✅ 4. INCRÉMENTER COMPTEUR RATE LIMITING
            RateLimiter::hit($rateLimitKey, $decayMinutes * 60);

            // ✅ 5. ENVOI DE L'EMAIL DE VÉRIFICATION
            $user->sendEmailVerificationNotification();

            // ✅ 6. LOGS DE SÉCURITÉ - EMAIL ENVOYÉ
            Log::info('✅ [EmailResend] Email de vérification renvoyé', [
                'user_id' => $user->id,
                'email' => $user->email,
                'attempt_number' => RateLimiter::attempts($rateLimitKey),
                'remaining_attempts' => $maxAttempts - RateLimiter::attempts($rateLimitKey),
                'ip' => $request->ip(),
            ]);

            // ✅ 7. RÉPONSE DE SUCCÈS
            return response()->json([
                'success' => true,
                'status' => 'verification-link-sent',
                'message' => 'Un nouveau lien de vérification a été envoyé à votre adresse email.',
                'email' => $this->maskEmail($user->email),
                'remaining_attempts' => $maxAttempts - RateLimiter::attempts($rateLimitKey),
                'next_attempt_available_in' => $availableIn ?? null,
            ]);

        } catch (ValidationException $e) {
            // ✅ 8. GESTION RATE LIMITING
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
                'rate_limited' => true,
            ], 429);

        } catch (\Exception $e) {
            // ✅ 9. GESTION D'ERREURS GÉNÉRALES
            Log::error('❌ [EmailResend] Erreur lors du renvoi d\'email', [
                'user_id' => $user->id ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer.',
                'error' => app()->environment('local') ? $e->getMessage() : 'Erreur interne',
            ], 500);
        }
    }

    /**
     * ✅ UTILITAIRE: Masquer l'email pour la sécurité
     * 
     * @param string $email Email à masquer
     * @return string Email masqué (ex: us***@ex***.com)
     */
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return '***@***.***';
        }

        $username = $parts[0];
        $domain = $parts[1];

        // Masquer le nom d'utilisateur
        $maskedUsername = strlen($username) > 2 
            ? substr($username, 0, 2) . str_repeat('*', strlen($username) - 2)
            : str_repeat('*', strlen($username));

        // Masquer le domaine
        $domainParts = explode('.', $domain);
        $maskedDomain = '';
        
        foreach ($domainParts as $index => $part) {
            if ($index > 0) $maskedDomain .= '.';
            
            $maskedDomain .= strlen($part) > 2 
                ? substr($part, 0, 2) . str_repeat('*', strlen($part) - 2)
                : str_repeat('*', strlen($part));
        }

        return $maskedUsername . '@' . $maskedDomain;
    }
}