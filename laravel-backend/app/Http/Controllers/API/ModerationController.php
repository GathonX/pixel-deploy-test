<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\BlockedUser;
use App\Models\HiddenContent;
use App\Models\ContentPreference;
use App\Models\BlogPost;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ModerationController extends Controller
{
    /**
     * Signaler un contenu
     */
    public function reportContent(Request $request)
    {
        $validated = $request->validate([
            'reportable_type' => ['required', Rule::in(['blog_post', 'comment', 'social_media_post'])],
            'reportable_id' => 'required|integer',
            'reason' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        // Convertir le type en classe de model
        $modelClass = $this->getModelClass($validated['reportable_type']);

        // Vérifier que le contenu existe
        $content = $modelClass::find($validated['reportable_id']);
        if (!$content) {
            return response()->json([
                'message' => 'Contenu non trouvé'
            ], 404);
        }

        // Créer le signalement
        $report = Report::create([
            'user_id' => Auth::id(),
            'reportable_type' => $modelClass,
            'reportable_id' => $validated['reportable_id'],
            'reason' => $validated['reason'] ?? 'user_report',
            'description' => $validated['description'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Contenu signalé avec succès',
            'report' => $report
        ], 201);
    }

    /**
     * Récupérer les signalements de l'utilisateur
     */
    public function getUserReports()
    {
        $reports = Report::where('user_id', Auth::id())
            ->with('reportable')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reports);
    }

    /**
     * Bloquer un utilisateur
     */
    public function blockUser(Request $request)
    {
        $validated = $request->validate([
            'blocked_user_id' => 'required|integer|exists:users,id',
            'reason' => 'nullable|string|max:255',
        ]);

        // Vérifier que l'utilisateur ne se bloque pas lui-même
        if ($validated['blocked_user_id'] == Auth::id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas vous bloquer vous-même'
            ], 400);
        }

        // Créer ou récupérer le blocage
        $blocked = BlockedUser::firstOrCreate([
            'user_id' => Auth::id(),
            'blocked_user_id' => $validated['blocked_user_id'],
        ], [
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => 'Utilisateur bloqué avec succès',
            'blocked_user' => $blocked
        ], 201);
    }

    /**
     * POST /api/users/{userId}/block - Bloquer un utilisateur par ID (route alternative)
     * Cette méthode est utilisée lorsque l'ID est passé en paramètre d'URL
     */
    public function blockUserById(int $userId)
    {
        // Vérifier que l'utilisateur existe
        $userExists = \App\Models\User::where('id', $userId)->exists();

        if (!$userExists) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé'
            ], 404);
        }

        // Vérifier que l'utilisateur ne se bloque pas lui-même
        if ($userId == Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez pas vous bloquer vous-même'
            ], 400);
        }

        // Créer ou récupérer le blocage
        $blocked = BlockedUser::firstOrCreate([
            'user_id' => Auth::id(),
            'blocked_user_id' => $userId,
        ], [
            'reason' => 'Bloqué depuis commentaires',
        ]);

        $wasRecentlyCreated = $blocked->wasRecentlyCreated;

        return response()->json([
            'success' => true,
            'message' => $wasRecentlyCreated
                ? 'Utilisateur bloqué avec succès'
                : 'Utilisateur déjà bloqué',
            'data' => $blocked
        ], $wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Débloquer un utilisateur
     */
    public function unblockUser(Request $request)
    {
        $validated = $request->validate([
            'blocked_user_id' => 'required|integer|exists:users,id',
        ]);

        $deleted = BlockedUser::where('user_id', Auth::id())
            ->where('blocked_user_id', $validated['blocked_user_id'])
            ->delete();

        if (!$deleted) {
            return response()->json([
                'message' => 'Utilisateur non trouvé dans votre liste de blocage'
            ], 404);
        }

        return response()->json([
            'message' => 'Utilisateur débloqué avec succès'
        ], 200);
    }

    /**
     * Récupérer la liste des utilisateurs bloqués
     */
    public function getBlockedUsers()
    {
        $blockedUsers = BlockedUser::where('user_id', Auth::id())
            ->with('blockedUser:id,name,email,avatar')
            ->get();

        return response()->json($blockedUsers);
    }

    /**
     * Masquer un contenu
     */
    public function hideContent(Request $request)
    {
        $validated = $request->validate([
            'hideable_type' => ['required', Rule::in(['blog_post', 'comment', 'social_media_post'])],
            'hideable_id' => 'required|integer',
        ]);

        // Convertir le type en classe de model
        $modelClass = $this->getModelClass($validated['hideable_type']);

        // Vérifier que le contenu existe
        $content = $modelClass::find($validated['hideable_id']);
        if (!$content) {
            return response()->json([
                'message' => 'Contenu non trouvé'
            ], 404);
        }

        // Créer ou récupérer le masquage
        $hidden = HiddenContent::firstOrCreate([
            'user_id' => Auth::id(),
            'hideable_type' => $modelClass,
            'hideable_id' => $validated['hideable_id'],
        ]);

        return response()->json([
            'message' => 'Contenu masqué avec succès',
            'hidden_content' => $hidden
        ], 201);
    }

    /**
     * Afficher un contenu précédemment masqué
     */
    public function unhideContent(Request $request)
    {
        $validated = $request->validate([
            'hideable_type' => ['required', Rule::in(['blog_post', 'comment', 'social_media_post'])],
            'hideable_id' => 'required|integer',
        ]);

        $modelClass = $this->getModelClass($validated['hideable_type']);

        $deleted = HiddenContent::where('user_id', Auth::id())
            ->where('hideable_type', $modelClass)
            ->where('hideable_id', $validated['hideable_id'])
            ->delete();

        if (!$deleted) {
            return response()->json([
                'message' => 'Contenu non trouvé dans votre liste de masqués'
            ], 404);
        }

        return response()->json([
            'message' => 'Contenu affiché à nouveau'
        ], 200);
    }

    /**
     * Récupérer les contenus masqués
     */
    public function getHiddenContents(Request $request)
    {
        $type = $request->query('type');

        $query = HiddenContent::where('user_id', Auth::id());

        if ($type) {
            $modelClass = $this->getModelClass($type);
            $query->where('hideable_type', $modelClass);
        }

        $hiddenContents = $query->with('hideable')->get();

        return response()->json($hiddenContents);
    }

    /**
     * Définir une préférence pour un contenu
     */
    public function setContentPreference(Request $request)
    {
        $validated = $request->validate([
            'preferable_type' => ['required', Rule::in(['blog_post', 'social_media_post'])],
            'preferable_id' => 'required|integer',
            'preference' => ['required', Rule::in(['interested', 'not_interested'])],
        ]);

        $modelClass = $this->getModelClass($validated['preferable_type']);

        // Créer ou mettre à jour la préférence
        $preference = ContentPreference::updateOrCreate([
            'user_id' => Auth::id(),
            'preferable_type' => $modelClass,
            'preferable_id' => $validated['preferable_id'],
        ], [
            'preference' => $validated['preference'],
        ]);

        return response()->json([
            'message' => 'Préférence enregistrée avec succès',
            'preference' => $preference
        ], 201);
    }

    /**
     * Supprimer une préférence
     */
    public function removeContentPreference(Request $request)
    {
        $validated = $request->validate([
            'preferable_type' => ['required', Rule::in(['blog_post', 'social_media_post'])],
            'preferable_id' => 'required|integer',
        ]);

        $modelClass = $this->getModelClass($validated['preferable_type']);

        $deleted = ContentPreference::where('user_id', Auth::id())
            ->where('preferable_type', $modelClass)
            ->where('preferable_id', $validated['preferable_id'])
            ->delete();

        if (!$deleted) {
            return response()->json([
                'message' => 'Préférence non trouvée'
            ], 404);
        }

        return response()->json([
            'message' => 'Préférence supprimée avec succès'
        ], 200);
    }

    /**
     * Récupérer les préférences de l'utilisateur
     */
    public function getUserPreferences()
    {
        $preferences = ContentPreference::where('user_id', Auth::id())
            ->with('preferable')
            ->get();

        return response()->json($preferences);
    }

    /**
     * Convertir le type de contenu en classe de model
     */
    private function getModelClass(string $type): string
    {
        return match($type) {
            'blog_post' => BlogPost::class,
            'comment' => Comment::class,
            'social_media_post' => \App\Models\SocialMediaPost::class,
            default => throw new \InvalidArgumentException("Type de contenu invalide: {$type}")
        };
    }
}
