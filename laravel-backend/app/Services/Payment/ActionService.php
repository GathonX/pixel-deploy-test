<?php
// laravel-backend/app/Services/Payment/ActionService.php
// ✅ SERVICE : Gestion centralisée des actions pour gagner des crédits
// ✅ COMPATIBLE : Avec votre système d'actions frontend

namespace App\Services\Payment;

use App\Models\ActionEarn;
use App\Models\UserActionCompletion;
use App\Models\User;
use App\Services\Payment\CreditService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ActionService
{
    protected $creditService;

    public function __construct(CreditService $creditService)
    {
        $this->creditService = $creditService;
    }

    /**
     * ✅ MÉTHODES - GESTION DES ACTIONS
     */

    /**
     * Obtenir toutes les actions disponibles pour un utilisateur
     */
    public function getAvailableActionsForUser(int $userId): array
    {
        $user = User::find($userId);
        
        $actions = ActionEarn::available()
            ->ordered()
            ->get();

        return $actions->map(function ($action) use ($userId, $user) {
            $canComplete = $action->canBeCompletedBy($userId, $user);
            $status = $action->getStatusForUser($userId);
            
            return [
                'id' => $action->action_key,
                'title' => $action->title,
                'description' => $action->description,
                'creditsReward' => $action->credits_reward,
                'estimatedTime' => $action->estimated_time,
                'difficulty' => $action->difficulty,
                'difficultyColor' => $action->difficulty_color,
                'category' => $action->category,
                'categoryDescription' => $action->category_description,
                'requirements' => $action->requirements,
                'validationMethod' => $action->validation_method,
                'cooldownPeriod' => $action->cooldown_period,
                'maxPerDay' => $action->max_per_day,
                'maxPerWeek' => $action->max_per_week,
                'maxPerMonth' => $action->max_per_month,
                'maxTotal' => $action->max_total,
                'icon' => $action->icon_name,
                'colorTheme' => $action->color_theme,
                'redirectUrl' => $action->redirect_url,
                'openInNewTab' => $action->open_in_new_tab,
                'status' => $status,
                'canComplete' => $canComplete['canComplete'],
                'reasons' => $canComplete['reasons'],
                'totalCompletions' => $action->total_completions,
                'completionRate' => $action->completion_rate,
            ];
        })->toArray();
    }

    /**
     * Démarrer une action pour un utilisateur
     */
    public function startAction(
        int $userId,
        string $actionKey,
        array $submissionData = [],
        string $source = 'web'
    ): UserActionCompletion {
        $action = ActionEarn::findByKey($actionKey);
        
        if (!$action || !$action->is_active) {
            throw new Exception("Action non trouvée ou inactive: {$actionKey}");
        }

        // Vérifier si l'utilisateur peut compléter cette action
        $canComplete = $action->canBeCompletedBy($userId);
        if (!$canComplete['canComplete']) {
            throw new Exception('Action non disponible: ' . implode(', ', $canComplete['reasons']));
        }

        try {
            DB::beginTransaction();

            // Créer la complétion
            $completion = UserActionCompletion::createCompletion(
                $userId,
                $action->id,
                $submissionData,
                $source
            );

            // Si validation automatique, traiter immédiatement
            if ($action->validation_method === ActionEarn::VALIDATION_AUTOMATIC) {
                $this->processAutomaticValidation($completion);
            }

            DB::commit();

            Log::info('Action started by user', [
                'action_key' => $actionKey,
                'user_id' => $userId,
                'completion_id' => $completion->id,
                'validation_method' => $action->validation_method,
                'auto_approved' => $completion->isAutoApproved(),
            ]);

            return $completion;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Action start failed', [
                'action_key' => $actionKey,
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Soumettre des preuves pour une action
     */
    public function submitProof(
        int $completionId,
        string $description = null,
        array $urls = [],
        array $files = []
    ): bool {
        $completion = UserActionCompletion::findOrFail($completionId);

        if (!$completion->isPending()) {
            throw new Exception('Cette complétion ne peut plus être modifiée');
        }

        try {
            $updated = false;

            // Mettre à jour la description
            if ($description) {
                $completion->update(['proof_description' => $description]);
                $updated = true;
            }

            // Ajouter les URLs
            foreach ($urls as $url) {
                $completion->addProofUrl($url['url'], $url['description'] ?? null);
                $updated = true;
            }

            // Ajouter les fichiers
            foreach ($files as $file) {
                $completion->addProofFile(
                    $file['filename'],
                    $file['path'],
                    $file['type'] ?? null
                );
                $updated = true;
            }

            if ($updated) {
                Log::info('Proof submitted for action completion', [
                    'completion_id' => $completionId,
                    'user_id' => $completion->user_id,
                    'action_key' => $completion->actionEarn->action_key,
                    'has_description' => !empty($description),
                    'urls_count' => count($urls),
                    'files_count' => count($files),
                ]);
            }

            return $updated;

        } catch (Exception $e) {
            Log::error('Proof submission failed', [
                'completion_id' => $completionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - VALIDATION DES ACTIONS
     */

    /**
     * Traiter la validation automatique
     */
    public function processAutomaticValidation(UserActionCompletion $completion): bool
    {
        try {
            // Auto-approuver
            $completion->autoApprove();

            Log::info('Action automatically validated', [
                'completion_id' => $completion->id,
                'user_id' => $completion->user_id,
                'action_key' => $completion->actionEarn->action_key,
                'credits_earned' => $completion->credits_earned,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Automatic validation failed', [
                'completion_id' => $completion->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Approuver une action (validation manuelle)
     */
    public function approveAction(
        int $completionId,
        int $validatedBy,
        string $notes = null
    ): bool {
        $completion = UserActionCompletion::findOrFail($completionId);

        if (!$completion->isPending()) {
            throw new Exception('Cette complétion ne peut plus être validée');
        }

        try {
            $success = $completion->approve($validatedBy, $notes);

            Log::info('Action manually approved', [
                'completion_id' => $completionId,
                'user_id' => $completion->user_id,
                'action_key' => $completion->actionEarn->action_key,
                'validated_by' => $validatedBy,
                'credits_earned' => $completion->credits_earned,
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Manual approval failed', [
                'completion_id' => $completionId,
                'validated_by' => $validatedBy,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Rejeter une action
     */
    public function rejectAction(
        int $completionId,
        int $validatedBy,
        string $reason = null
    ): bool {
        $completion = UserActionCompletion::findOrFail($completionId);

        if (!$completion->isPending()) {
            throw new Exception('Cette complétion ne peut plus être validée');
        }

        try {
            $success = $completion->reject($validatedBy, $reason);

            Log::info('Action rejected', [
                'completion_id' => $completionId,
                'user_id' => $completion->user_id,
                'action_key' => $completion->actionEarn->action_key,
                'validated_by' => $validatedBy,
                'reason' => $reason,
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Action rejection failed', [
                'completion_id' => $completionId,
                'validated_by' => $validatedBy,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - GESTION ADMINISTRATIVE
     */

    /**
     * Obtenir les actions en attente de validation
     */
    public function getPendingValidations(int $limit = 50): array
    {
        $completions = UserActionCompletion::getPendingValidations($limit);

        return $completions->map(function ($completion) {
            return [
                'id' => $completion->id,
                'user' => [
                    'id' => $completion->user_id,
                    'name' => $completion->user->name,
                    'email' => $completion->user->email,
                ],
                'action' => [
                    'key' => $completion->actionEarn->action_key,
                    'title' => $completion->actionEarn->title,
                    'credits_reward' => $completion->actionEarn->credits_reward,
                    'validation_method' => $completion->actionEarn->validation_method,
                ],
                'completion' => [
                    'credits_earned' => $completion->credits_earned,
                    'completed_at' => $completion->completed_at->toDateString(),
                    'completed_at_time' => $completion->completed_at->format('H:i'),
                    'attempt_number' => $completion->attempt_number,
                    'source' => $completion->source,
                ],
                'proof' => [
                    'description' => $completion->proof_description,
                    'urls' => $completion->proof_urls ?? [],
                    'files' => $completion->proof_files ?? [],
                    'has_proof' => $completion->hasProof(),
                ],
                'submission_data' => $completion->submission_data ?? [],
            ];
        })->toArray();
    }

    /**
     * Validation en lot
     */
    public function bulkValidate(array $completionIds, string $action, int $validatedBy, string $notes = null): array
    {
        $results = [
            'success' => [],
            'failed' => [],
        ];

        foreach ($completionIds as $completionId) {
            try {
                if ($action === 'approve') {
                    $this->approveAction($completionId, $validatedBy, $notes);
                    $results['success'][] = $completionId;
                } elseif ($action === 'reject') {
                    $this->rejectAction($completionId, $validatedBy, $notes);
                    $results['success'][] = $completionId;
                } else {
                    throw new Exception("Action invalide: {$action}");
                }
            } catch (Exception $e) {
                $results['failed'][] = [
                    'completion_id' => $completionId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        Log::info('Bulk validation completed', [
            'action' => $action,
            'validated_by' => $validatedBy,
            'total_processed' => count($completionIds),
            'success_count' => count($results['success']),
            'failed_count' => count($results['failed']),
        ]);

        return $results;
    }

    /**
     * ✅ MÉTHODES - STATISTIQUES ET HISTORIQUE
     */

    /**
     * Obtenir l'historique des actions d'un utilisateur
     */
    public function getUserActionHistory(int $userId, int $limit = 20): array
    {
        return UserActionCompletion::getHistoryForUser($userId, $limit);
    }

    /**
     * Obtenir les statistiques d'actions d'un utilisateur
     */
    public function getUserActionStats(int $userId): array
    {
        $completions = UserActionCompletion::forUser($userId)->get();
        $approved = $completions->filter(fn($c) => $c->isApproved());
        $pending = $completions->filter(fn($c) => $c->isPending());
        $rejected = $completions->filter(fn($c) => $c->isRejected());

        return [
            'total_actions' => $completions->count(),
            'approved_actions' => $approved->count(),
            'pending_actions' => $pending->count(),
            'rejected_actions' => $rejected->count(),
            'total_credits_earned' => $approved->sum('credits_earned'),
            'pending_credits' => $pending->sum('credits_earned'),
            'approval_rate' => $completions->count() > 0 
                ? round(($approved->count() / $completions->count()) * 100, 1)
                : 0,
            'by_category' => $approved->groupBy(function ($completion) {
                return $completion->actionEarn->category;
            })->map(function ($categoryCompletions) {
                return [
                    'count' => $categoryCompletions->count(),
                    'credits' => $categoryCompletions->sum('credits_earned'),
                ];
            }),
            'recent_activity' => $completions->sortByDesc('completed_at')
                ->take(5)
                ->map(function ($completion) {
                    return [
                        'action_title' => $completion->actionEarn->title,
                        'credits_earned' => $completion->credits_earned,
                        'status' => $completion->validation_status,
                        'completed_at' => $completion->completed_at->toDateString(),
                    ];
                })
                ->values()
                ->toArray(),
        ];
    }

    /**
     * Obtenir les statistiques globales des actions
     */
    public function getGlobalActionStats(): array
    {
        $actions = ActionEarn::with(['userCompletions', 'approvedCompletions'])->get();
        $totalCompletions = UserActionCompletion::count();
        $approvedCompletions = UserActionCompletion::approved()->count();
        $pendingCompletions = UserActionCompletion::pending()->count();

        return [
            'total_actions' => $actions->count(),
            'active_actions' => $actions->where('is_active', true)->count(),
            'total_completions' => $totalCompletions,
            'approved_completions' => $approvedCompletions,
            'pending_completions' => $pendingCompletions,
            'rejected_completions' => UserActionCompletion::rejected()->count(),
            'global_approval_rate' => $totalCompletions > 0 
                ? round(($approvedCompletions / $totalCompletions) * 100, 1)
                : 0,
            'total_credits_distributed' => UserActionCompletion::approved()->sum('credits_earned'),
            'by_category' => $actions->groupBy('category')->map(function ($categoryActions) {
                return [
                    'actions_count' => $categoryActions->count(),
                    'total_completions' => $categoryActions->sum('total_completions'),
                    'avg_completion_rate' => $categoryActions->avg('completion_rate'),
                ];
            }),
            'most_popular_actions' => $actions->sortByDesc('total_completions')
                ->take(5)
                ->map(function ($action) {
                    return [
                        'key' => $action->action_key,
                        'title' => $action->title,
                        'total_completions' => $action->total_completions,
                        'completion_rate' => $action->completion_rate,
                        'credits_reward' => $action->credits_reward,
                    ];
                })
                ->values()
                ->toArray(),
        ];
    }

    /**
     * ✅ MÉTHODES - ACTIONS SPÉCIALISÉES
     */

    /**
     * Traiter une action de parrainage
     */
    public function processReferralAction(int $userId, int $referredUserId, string $referralCode = null): ?UserActionCompletion
    {
        $referralAction = ActionEarn::findByKey('referral_signup');
        
        if (!$referralAction || !$referralAction->is_active) {
            Log::warning('Referral action not found or inactive');
            return null;
        }

        try {
            $completion = $this->startAction(
                $userId,
                'referral_signup',
                [
                    'referred_user_id' => $referredUserId,
                    'referral_code' => $referralCode,
                    'referral_date' => now()->toISOString(),
                ],
                'referral_system'
            );

            Log::info('Referral action processed', [
                'referrer_user_id' => $userId,
                'referred_user_id' => $referredUserId,
                'completion_id' => $completion->id,
                'credits_earned' => $completion->credits_earned,
            ]);

            return $completion;

        } catch (Exception $e) {
            Log::error('Referral action processing failed', [
                'referrer_user_id' => $userId,
                'referred_user_id' => $referredUserId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Traiter une action de partage social
     */
    public function processSocialShareAction(int $userId, string $platform, string $shareUrl): ?UserActionCompletion
    {
        $shareAction = ActionEarn::findByKey('social_share');
        
        if (!$shareAction || !$shareAction->is_active) {
            return null;
        }

        try {
            $completion = $this->startAction(
                $userId,
                'social_share',
                [
                    'platform' => $platform,
                    'share_url' => $shareUrl,
                    'shared_at' => now()->toISOString(),
                ],
                'social_integration'
            );

            return $completion;

        } catch (Exception $e) {
            Log::error('Social share action processing failed', [
                'user_id' => $userId,
                'platform' => $platform,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}