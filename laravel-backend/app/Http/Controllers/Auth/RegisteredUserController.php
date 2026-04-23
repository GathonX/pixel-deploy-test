<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    /**
     * Inscription : création utilisateur + workspace + projet par défaut.
     * Email de vérification envoyé, déconnexion immédiate.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:' . User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        try {
            Log::info('[Registration] Nouvelle inscription', [
                'email' => $request->email,
                'ip'    => $request->ip(),
            ]);

            // 1. Créer l'utilisateur
            $user = User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => Hash::make($request->password),
            ]);
            $user->refresh();

            // 2. Créer le workspace (trial 14 jours)
            try {
                $trialEnds = now()->addDays(14);
                DB::transaction(function () use ($user, $trialEnds) {
                    $ws = Workspace::create([
                        'owner_user_id'   => $user->id,
                        'name'            => $user->name . ' Workspace',
                        'status'          => 'trial_active',
                        'trial_starts_at' => now(),
                        'trial_ends_at'   => $trialEnds,
                    ]);
                    WorkspaceUser::create([
                        'workspace_id' => $ws->id,
                        'user_id'      => $user->id,
                        'role'         => 'owner',
                        'joined_at'    => now(),
                    ]);
                    $ws->subscriptions()->create([
                        'plan_key'  => 'starter',
                        'status'    => 'trial_active',
                        'starts_at' => now(),
                        'ends_at'   => $trialEnds,
                        'source'    => 'manual',
                    ]);
                });
            } catch (\Exception $e) {
                Log::warning('[Registration] Erreur création workspace', ['error' => $e->getMessage()]);
            }

            // 3. Créer un projet par défaut
            try {
                $project = Project::create([
                    'user_id'     => $user->id,
                    'name'        => 'Mon Premier Projet',
                    'description' => 'Projet créé lors de l\'inscription',
                    'status'      => 'active',
                    'settings'    => ['created_from' => 'registration', 'is_default' => true],
                ]);
            } catch (\Exception $e) {
                Log::warning('[Registration] Erreur création projet', ['error' => $e->getMessage()]);
                $project = null;
            }

            // 4. Connexion temporaire pour envoi email uniquement
            $emailSent = false;
            try {
                Auth::login($user);
                $user->sendEmailVerificationNotification();
                $emailSent = true;
            } catch (\Exception $mailException) {
                Log::error('[Registration] Erreur envoi email vérification', [
                    'user_id' => $user->id,
                    'error'   => $mailException->getMessage(),
                ]);
            } finally {
                Auth::logout();
            }

            Log::info('[Registration] Inscription terminée', [
                'user_id'    => $user->id,
                'project_id' => $project?->id,
                'email_sent' => $emailSent,
            ]);

            $message = $emailSent
                ? 'Inscription réussie ! Un email de vérification vient de vous être envoyé.'
                : 'Inscription réussie ! Veuillez contacter le support si vous ne recevez pas l\'email de vérification.';

            return response()->json([
                'success'      => true,
                'message'      => $message,
                'user'         => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                ],
                'redirect_to'  => '/verify-email',
                'redirect_state' => [
                    'email'            => $user->email,
                    'fromRegistration' => true,
                ],
                'email_sent'   => $emailSent,
            ]);

        } catch (\Exception $e) {
            Log::error('[Registration] Erreur inscription', [
                'email' => $request->email ?? 'unknown',
                'error' => $e->getMessage(),
            ]);

            if (isset($user) && $user instanceof User) {
                try { Auth::logout(); } catch (\Exception $ce) {}
            }

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.',
                'errors'  => ['general' => ['Erreur interne du serveur.']],
            ], 500);
        }
    }
}
