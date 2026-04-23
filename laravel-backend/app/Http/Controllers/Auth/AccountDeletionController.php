<?php
// app/Http/Controllers/Auth/AccountDeletionController.php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AccountDeletionFeedback;
use App\Notifications\AccountDeletionNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

class AccountDeletionController extends Controller
{
    /**
     * Étape 1 : l'utilisateur authentifié demande la suppression avec feedback — on envoie un lien signé.
     */
    public function requestDelete(Request $request): JsonResponse
    {
        $request->validate([
            'reason' => ['required', Rule::in(array_keys(AccountDeletionFeedback::REASONS))],
            'detailed_reason' => 'nullable|string|max:1000',
            'satisfaction_rating' => 'nullable|integer|min:1|max:5',
            'suggestions' => 'nullable|string|max:1000',
            'would_recommend' => 'nullable|boolean'
        ]);

        $user = $request->user();

        try {
            // ✅ SAUVEGARDER LE FEEDBACK IMMÉDIATEMENT (avant l'email)
            $feedback = AccountDeletionFeedback::create([
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_name' => $user->name,
                'reason' => $request->reason,
                'detailed_reason' => $request->detailed_reason,
                'satisfaction_rating' => $request->satisfaction_rating,
                'suggestions' => $request->suggestions,
                'would_recommend' => $request->would_recommend,
                'additional_data' => [
                    'user_agent' => $request->userAgent(),
                    'ip_address' => $request->ip(),
                    'created_at_original' => $user->created_at->toISOString(),
                    'subscription_type' => $user->subscription_type ?? null,
                    'deletion_requested_at' => now()->toISOString()
                ],
                'account_deleted_at' => null // Sera mis à jour lors de la confirmation
            ]);

            // Feedback saved successfully

        } catch (\Exception $e) {
            // Log error silently - continue even if feedback fails
        }

        $signedUrl = URL::temporarySignedRoute(
            'account.delete.confirm',        // nom de la route Web
            Carbon::now()->addMinutes(60),   // valable 60 minutes
            [
                'id'   => $user->id,
                'hash' => sha1($user->email)
            ]
        );

        // Envoi de l'email de confirmation
        $user->notify(new AccountDeletionNotification($signedUrl));

        return response()->json([
            'message' => 'Un email de confirmation vient de vous être envoyé.',
        ], 200);
    }

    /**
     * Étape 2 : l'utilisateur clique dans l'email — on confirme la suppression.
     * Cette route doit être déclarée dans routes/web.php (guard "web", sessions actives).
     */
    public function confirmDelete(Request $request, $id, $hash)
    {
        // 1) Signature valide ?
        if (! $request->hasValidSignature()) {
            abort(403, 'Lien invalide ou expiré.');
        }

        // 2) On récupère l'utilisateur et on vérifie le hash
        $user = User::findOrFail($id);
        if (! hash_equals(sha1($user->email), $hash)) {
            abort(403, 'Lien invalide.');
        }

        // 3) Mettre à jour le feedback existant avec la date de suppression effective
        try {
            $feedback = AccountDeletionFeedback::where('user_id', $user->id)
                ->whereNull('account_deleted_at')
                ->latest()
                ->first();
            
            if ($feedback) {
                $feedback->update([
                    'account_deleted_at' => now(),
                    'additional_data' => array_merge($feedback->additional_data ?? [], [
                        'deletion_confirmed_at' => now()->toISOString(),
                        'confirmation_ip' => $request->ip(),
                        'confirmation_user_agent' => $request->userAgent()
                    ])
                ]);
                
                // Feedback updated successfully
            } else {
                // No feedback found for this user
            }
        } catch (\Exception $e) {
            // Error updating feedback - continue with account deletion
        }

        // 4) Déconnexion de la session web
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // 5) Purge des tokens API (Sanctum)
        $user->tokens()->delete();

        // 6) Suppression définitive
        $user->delete();

        // 7) Redirection vers le front
        return redirect(config('app.frontend_url') . '/account-deleted');
    }

    /**
     * Récupérer les raisons de suppression disponibles
     */
    public function getDeletionReasons(Request $request): JsonResponse
    {
        return response()->json([
            'reasons' => AccountDeletionFeedback::REASONS
        ]);
    }
}
