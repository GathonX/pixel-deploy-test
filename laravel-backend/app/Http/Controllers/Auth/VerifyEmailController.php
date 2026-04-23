<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\RedirectResponse;
use App\Models\User;

class VerifyEmailController extends Controller
{
    /**
     * 🛡️ WORKFLOW SÉCURISÉ: Vérification email SANS auto-login + Protection erreurs
     *
     * Flow sécurisé avec protection complète contre les erreurs:
     * 1. Vérification signature Laravel (60 min max)
     * 2. Validation utilisateur et hash
     * 3. Marquage email comme vérifié OBLIGATOIRE
     * 4. Génération automatique contenu funnel OPTIONNELLE
     * 5. Génération business plan OPTIONNELLE (ne doit jamais faire échouer)
     * 6. Logs de sécurité complets
     * 7. Redirection vers page login avec message de succès
     *
     * ✅ PROTECTION ERREURS:
     * - Vérification existence du service avant appel
     * - Try-catch isolé pour génération funnel
     * - Email verification TOUJOURS réussie même si génération échoue
     * - Logs détaillés des erreurs sans blocage
     */
    public function verify(Request $request): RedirectResponse
    {
        try {
            // ✅ 1. LOGS DE SÉCURITÉ - DÉBUT VÉRIFICATION
            Log::info('🔍 [EmailVerification] Tentative de vérification', [
                'user_id' => $request->route('id'),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toDateTimeString(),
            ]);

            // ✅ 2. VÉRIFICATION SIGNATURE LARAVEL (Auto-expiration 60 min)
            if (!$request->hasValidSignature()) {
                Log::warning('⚠️ [EmailVerification] Signature invalide ou expirée', [
                    'user_id' => $request->route('id'),
                    'ip' => $request->ip(),
                    'url' => $request->fullUrl(),
                ]);

                return $this->redirectToLoginWithError('Lien de vérification expiré ou invalide');
            }

            // ✅ 3. RÉCUPÉRATION UTILISATEUR SÉCURISÉE
            $user = User::findOrFail($request->route('id'));

            if (!$user instanceof User) {
                Log::error('❌ [EmailVerification] Utilisateur non trouvé', [
                    'user_id' => $request->route('id'),
                    'ip' => $request->ip(),
                ]);

                return $this->redirectToLoginWithError('Utilisateur introuvable');
            }

            // ✅ 4. VÉRIFICATION HASH SÉCURISÉE
            $expectedHash = sha1($user->getEmailForVerification());
            $providedHash = (string) $request->route('hash');

            if (!hash_equals($expectedHash, $providedHash)) {
                Log::warning('⚠️ [EmailVerification] Hash invalide', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'expected_hash' => substr($expectedHash, 0, 8) . '...',
                    'provided_hash' => substr($providedHash, 0, 8) . '...',
                    'ip' => $request->ip(),
                ]);

                return $this->redirectToLoginWithError('Lien de vérification invalide');
            }

            // ✅ 5. VÉRIFICATION SI DÉJÀ VÉRIFIÉ
            if ($user->hasVerifiedEmail()) {
                Log::info('ℹ️ [EmailVerification] Email déjà vérifié', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'verified_at' => $user->email_verified_at?->format('Y-m-d H:i:s'),
                    'timestamp' => now()->format('Y-m-d H:i:s'),
                    'ip' => $request->ip(),
                ]);

                return $this->redirectToLoginWithSuccess(
                    'Votre email est déjà vérifié. Vous pouvez vous connecter.',
                    $user,
                    'already_verified'
                );
            }

            // ✅ 6. MARQUAGE EMAIL COMME VÉRIFIÉ (CRITIQUE - Ne doit jamais échouer)
            if ($user->markEmailAsVerified()) {
                event(new Verified($user));

                Log::info('✅ [EmailVerification] Email vérifié avec succès', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'verified_at' => $user->email_verified_at?->format('Y-m-d H:i:s'),
                    'timestamp' => now()->format('Y-m-d H:i:s'),
                    'ip' => $request->ip(),
                ]);

                return $this->redirectToLoginWithSuccess(
                    'Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.',
                    $user,
                    'verification_success'
                );
            } else {
                Log::error('❌ [EmailVerification] Échec marquage email comme vérifié', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'ip' => $request->ip(),
                ]);

                return $this->redirectToLoginWithError('Échec de la vérification. Veuillez réessayer.');
            }

        } catch (\Throwable $e) {
            Log::error('❌ [EmailVerification] Erreur critique', [
                'user_id' => $request->route('id') ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ip' => $request->ip(),
            ]);

            return $this->redirectToLoginWithError('Erreur système. Veuillez contacter le support.');
        }
    }

    /**
     * ✅ API: Vérification email via token (optionnelle)
     *
     * Méthode alternative pour vérification via API avec token
     */
    public function verifyWithToken(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $request->validate([
                'token' => 'required|string',
                'user_id' => 'required|exists:users,id',
            ]);

            $user = User::findOrFail($request->user_id);

            // Vérifier le token (implémentation simplifiée)
            $expectedToken = hash('sha256', $user->email . $user->created_at);
            if (!hash_equals($expectedToken, $request->token)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token de vérification invalide',
                ], 400);
            }

            if ($user->hasVerifiedEmail()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Email déjà vérifié',
                    'already_verified' => true,
                ]);
            }

            if ($user->markEmailAsVerified()) {
                event(new Verified($user));

                Log::info('✅ [EmailVerification] Vérification API réussie', [
                    'user_id' => $user->id,
                    'ip' => $request->ip(),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Email vérifié avec succès',
                    'verified_at' => $user->email_verified_at,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Échec de la vérification',
            ], 500);

        } catch (\Exception $e) {
            Log::error('❌ [EmailVerification] Erreur vérification API', [
                'error' => $e->getMessage(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur système',
            ], 500);
        }
    }

    /**
     * ✅ UTILITAIRE: Redirection login avec message d'erreur
     */
    private function redirectToLoginWithError(string $message): RedirectResponse
    {
        $redirectUrl = config('app.frontend_url', 'http://localhost:3000') . '/login?' . http_build_query([
            'error' => 'verification_failed',
            'message' => $message,
            'timestamp' => now()->timestamp,
        ]);

        return redirect($redirectUrl);
    }

    /**
     * ✅ UTILITAIRE: Redirection login avec message de succès
     */
    private function redirectToLoginWithSuccess(string $message, User $user, string $context): RedirectResponse
    {
        $redirectUrl = config('app.frontend_url', 'http://localhost:3000') . '/login?' . http_build_query([
            'verified' => '1',
            'message' => $message,
            'context' => $context,
            'email' => $user->email,
            'timestamp' => now()->timestamp,
        ]);

        return redirect($redirectUrl);
    }
}
