<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class EmailStatusController extends Controller
{
    /**
     * ✅ VÉRIFIER LE STATUT D'UN EMAIL (EXISTE + VÉRIFIÉ)
     * 
     * Cette méthode permet de vérifier si un email existe déjà
     * et s'il est vérifié, pour guider l'utilisateur intelligemment
     */
    public function checkStatus(Request $request): JsonResponse
    {
        try {
            // ✅ 1. VALIDATION DE L'EMAIL
            $validator = Validator::make($request->all(), [
                'email' => ['required', 'email', 'max:255'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Adresse email invalide.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $email = $request->email;
            
            Log::info('🔍 [EmailStatus] Vérification statut email', [
                'email' => $email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // ✅ 2. RECHERCHER L'UTILISATEUR
            $user = User::where('email', $email)->first();

            if (!$user) {
                // Email n'existe pas - peut créer un compte
                Log::info('✅ [EmailStatus] Email disponible', [
                    'email' => $email,
                    'exists' => false,
                ]);

                return response()->json([
                    'success' => true,
                    'exists' => false,
                    'verified' => false,
                    'message' => 'Cette adresse email est disponible.',
                    'can_register' => true,
                ]);
            }

            // ✅ 3. EMAIL EXISTE - VÉRIFIER LE STATUT DE VÉRIFICATION
            $isVerified = $user->hasVerifiedEmail();
            
            Log::info('📧 [EmailStatus] Email existant trouvé', [
                'email' => $email,
                'user_id' => $user->id,
                'exists' => true,
                'verified' => $isVerified,
                'created_at' => $user->created_at,
                'verified_at' => $user->email_verified_at,
            ]);

            if (!$isVerified) {
                // ✅ COMPTE EXISTE MAIS PAS VÉRIFIÉ
                return response()->json([
                    'success' => true,
                    'exists' => true,
                    'verified' => false,
                    'message' => 'Un compte existe avec cette adresse mais n\'est pas encore vérifié.',
                    'can_register' => false,
                    'can_resend_verification' => true,
                    'created_at' => $user->created_at->toISOString(),
                    'suggestions' => [
                        'Vérifiez votre boîte email (et dossier spam)',
                        'Renvoyez l\'email de vérification',
                        'Contactez le support si besoin',
                    ],
                ]);
            } else {
                // ✅ COMPTE EXISTE ET EST VÉRIFIÉ
                return response()->json([
                    'success' => true,
                    'exists' => true,
                    'verified' => true,
                    'message' => 'Un compte vérifié existe déjà avec cette adresse email.',
                    'can_register' => false,
                    'can_login' => true,
                    'verified_at' => $user->email_verified_at,
                    'suggestions' => [
                        'Connectez-vous avec vos identifiants',
                        'Utilisez "Mot de passe oublié" si nécessaire',
                        'Contactez le support pour toute assistance',
                    ],
                ]);
            }

        } catch (\Exception $e) {
            Log::error('❌ [EmailStatus] Erreur lors de la vérification', [
                'email' => $request->email ?? 'non fourni',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la vérification.',
                'error_code' => 'EMAIL_STATUS_CHECK_FAILED',
            ], 500);
        }
    }

    /**
     * ✅ RENVOYER EMAIL DE VÉRIFICATION POUR UN EMAIL SPÉCIFIQUE
     * 
     * Méthode alternative pour renvoyer un email sans être connecté
     */
    public function resendVerification(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => ['required', 'email', 'exists:users,email'],
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Adresse email introuvable.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = User::where('email', $request->email)->first();

            if ($user->hasVerifiedEmail()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette adresse email est déjà vérifiée.',
                ], 422);
            }

            try {
                $user->sendEmailVerificationNotification();
                $emailSent = true;
            } catch (\Exception $mailException) {
                Log::error('❌ [EmailStatus] Erreur SMTP renvoi email', [
                    'email'   => $user->email,
                    'user_id' => $user->id,
                    'error'   => $mailException->getMessage(),
                ]);
                $emailSent = false;
            }

            Log::info('📧 [EmailStatus] Email de vérification renvoyé', [
                'email' => $user->email,
                'user_id' => $user->id,
                'ip' => $request->ip(),
                'email_sent' => $emailSent,
            ]);

            return response()->json([
                'success' => true,
                'message' => $emailSent
                    ? 'Email de vérification renvoyé avec succès.'
                    : 'Votre demande a été enregistrée. Si vous ne recevez pas l\'email, contactez le support.',
                'email' => $user->email,
                'email_sent' => $emailSent,
            ]);

        } catch (\Exception $e) {
            Log::error('❌ [EmailStatus] Erreur renvoi email', [
                'email' => $request->email ?? 'non fourni',
                'error' => $e->getMessage(),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du renvoi de l\'email.',
            ], 500);
        }
    }
}
