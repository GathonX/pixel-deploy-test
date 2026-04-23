<?php
// laravel-backend/app/Models/ActionEarn.php
// ✅ MODÈLE : Action pour gagner des crédits
// ✅ COMPATIBLE : Avec votre interface Action frontend

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class ActionEarn extends Model
{
    use HasFactory;

    /**
     * ✅ Champs assignables en masse
     */
    protected $fillable = [
        'action_key',
        'title',
        'description',
        'credits_reward',
        'estimated_time',
        'difficulty',
        'category',
        'requirements',
        'validation_method',
        'cooldown_period',
        'max_per_day',
        'max_per_week',
        'max_per_month',
        'max_total',
        'icon_name',
        'color_theme',
        'redirect_url',
        'open_in_new_tab',
        'min_user_level',
        'required_features',
        'is_active',
        'sort_order',
        'available_from',
        'available_until',
        'total_completions',
        'pending_validations',
        'completion_rate',
        'metadata',
    ];

    /**
     * ✅ Cast des attributs
     */
    protected $casts = [
        'credits_reward' => 'integer',
        'requirements' => 'array',
        'max_per_day' => 'integer',
        'max_per_week' => 'integer',
        'max_per_month' => 'integer',
        'max_total' => 'integer',
        'open_in_new_tab' => 'boolean',
        'min_user_level' => 'integer',
        'required_features' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'available_from' => 'datetime',
        'available_until' => 'datetime',
        'total_completions' => 'integer',
        'pending_validations' => 'integer',
        'completion_rate' => 'decimal:2',
        'metadata' => 'array',
    ];

    /**
     * ✅ CONSTANTES - Difficultés
     */
    public const DIFFICULTY_EASY = 'easy';
    public const DIFFICULTY_MEDIUM = 'medium';
    public const DIFFICULTY_HARD = 'hard';

    public const DIFFICULTIES = [
        self::DIFFICULTY_EASY,
        self::DIFFICULTY_MEDIUM,
        self::DIFFICULTY_HARD,
    ];

    /**
     * ✅ CONSTANTES - Catégories
     */
    public const CATEGORY_SOCIAL = 'social';
    public const CATEGORY_REVIEW = 'review';
    public const CATEGORY_REFERRAL = 'referral';
    public const CATEGORY_COMMUNITY = 'community';
    public const CATEGORY_CONTENT = 'content';

    public const CATEGORIES = [
        self::CATEGORY_SOCIAL,
        self::CATEGORY_REVIEW,
        self::CATEGORY_REFERRAL,
        self::CATEGORY_COMMUNITY,
        self::CATEGORY_CONTENT,
    ];

    /**
     * ✅ CONSTANTES - Méthodes de validation
     */
    public const VALIDATION_AUTOMATIC = 'automatic';
    public const VALIDATION_MANUAL = 'manual';
    public const VALIDATION_HYBRID = 'hybrid';

    public const VALIDATION_METHODS = [
        self::VALIDATION_AUTOMATIC,
        self::VALIDATION_MANUAL,
        self::VALIDATION_HYBRID,
    ];

    /**
     * ✅ RELATIONS
     */

    /**
     * Action peut avoir plusieurs complétions par les utilisateurs
     */
    public function userCompletions(): HasMany
    {
        return $this->hasMany(UserActionCompletion::class);
    }

    /**
     * Action peut avoir des complétions en attente de validation
     */
    public function pendingCompletions(): HasMany
    {
        return $this->hasMany(UserActionCompletion::class)
                    ->where('validation_status', 'pending');
    }

    /**
     * Action peut avoir des complétions approuvées
     */
    public function approvedCompletions(): HasMany
    {
        return $this->hasMany(UserActionCompletion::class)
                    ->where('validation_status', 'approved');
    }

    /**
     * ✅ SCOPES
     */

    /**
     * Scope pour les actions actives
     */
    public function scopeActive($query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour les actions disponibles maintenant
     */
    public function scopeAvailable($query): Builder
    {
        $now = now();
        
        return $query->where('is_active', true)
                    ->where(function ($q) use ($now) {
                        $q->whereNull('available_from')
                          ->orWhere('available_from', '<=', $now);
                    })
                    ->where(function ($q) use ($now) {
                        $q->whereNull('available_until')
                          ->orWhere('available_until', '>=', $now);
                    });
    }

    /**
     * Scope par catégorie
     */
    public function scopeByCategory($query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope par difficulté
     */
    public function scopeByDifficulty($query, string $difficulty): Builder
    {
        return $query->where('difficulty', $difficulty);
    }

    /**
     * Scope pour ordonner par ordre d'affichage
     */
    public function scopeOrdered($query): Builder
    {
        return $query->orderBy('sort_order')
                    ->orderBy('credits_reward', 'desc');
    }

    /**
     * Scope par clé d'action
     */
    public function scopeByKey($query, string $actionKey): Builder
    {
        return $query->where('action_key', $actionKey);
    }

    /**
     * Scope pour les actions avec validation manuelle
     */
    public function scopeManualValidation($query): Builder
    {
        return $query->whereIn('validation_method', [
            self::VALIDATION_MANUAL,
            self::VALIDATION_HYBRID
        ]);
    }

    /**
     * ✅ MÉTHODES UTILITAIRES - DISPONIBILITÉ
     */

    /**
     * Vérifier si l'action est disponible maintenant
     */
    public function isAvailable(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();

        if ($this->available_from && $this->available_from->gt($now)) {
            return false;
        }

        if ($this->available_until && $this->available_until->lt($now)) {
            return false;
        }

        return true;
    }

    /**
     * Vérifier si l'action est en période de cooldown pour un utilisateur
     */
    public function isInCooldown(int $userId): bool
    {
        if (!$this->cooldown_period) {
            return false;
        }

        $lastCompletion = $this->userCompletions()
            ->where('user_id', $userId)
            ->where('validation_status', '!=', 'rejected')
            ->latest('completed_at')
            ->first();

        if (!$lastCompletion) {
            return false;
        }

        $cooldownEnd = $this->calculateCooldownEnd($lastCompletion->completed_at);
        
        return now()->lt($cooldownEnd);
    }

    /**
     * Calculer la fin du cooldown
     */
    private function calculateCooldownEnd(Carbon $lastCompletion): Carbon
    {
        return match($this->cooldown_period) {
            '1h' => $lastCompletion->addHour(),
            '6h' => $lastCompletion->addHours(6),
            '12h' => $lastCompletion->addHours(12),
            '24h', '1day' => $lastCompletion->addDay(),
            '1week' => $lastCompletion->addWeek(),
            '1month' => $lastCompletion->addMonth(),
            default => $lastCompletion->addDay(),
        };
    }

    /**
     * ✅ MÉTHODES UTILITAIRES - LIMITES
     */

    /**
     * Vérifier si l'utilisateur a atteint la limite quotidienne
     */
    public function hasReachedDailyLimit(int $userId): bool
    {
        if (!$this->max_per_day) {
            return false;
        }

        $todayCount = $this->userCompletions()
            ->where('user_id', $userId)
            ->whereDate('completed_at', today())
            ->where('validation_status', '!=', 'rejected')
            ->count();

        return $todayCount >= $this->max_per_day;
    }

    /**
     * Vérifier si l'utilisateur a atteint la limite hebdomadaire
     */
    public function hasReachedWeeklyLimit(int $userId): bool
    {
        if (!$this->max_per_week) {
            return false;
        }

        $weekCount = $this->userCompletions()
            ->where('user_id', $userId)
            ->whereBetween('completed_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->where('validation_status', '!=', 'rejected')
            ->count();

        return $weekCount >= $this->max_per_week;
    }

    /**
     * Vérifier si l'utilisateur a atteint la limite mensuelle
     */
    public function hasReachedMonthlyLimit(int $userId): bool
    {
        if (!$this->max_per_month) {
            return false;
        }

        $monthCount = $this->userCompletions()
            ->where('user_id', $userId)
            ->whereMonth('completed_at', now()->month)
            ->whereYear('completed_at', now()->year)
            ->where('validation_status', '!=', 'rejected')
            ->count();

        return $monthCount >= $this->max_per_month;
    }

    /**
     * Vérifier si l'utilisateur a atteint la limite totale
     */
    public function hasReachedTotalLimit(int $userId): bool
    {
        if (!$this->max_total) {
            return false;
        }

        $totalCount = $this->userCompletions()
            ->where('user_id', $userId)
            ->where('validation_status', 'approved')
            ->count();

        return $totalCount >= $this->max_total;
    }

    /**
     * Vérifier si l'utilisateur peut compléter cette action
     */
    public function canBeCompletedBy(int $userId, ?User $user = null): array
    {
        $reasons = [];

        if (!$this->isAvailable()) {
            $reasons[] = 'Action non disponible';
        }

        if ($this->isInCooldown($userId)) {
            $reasons[] = 'Période de cooldown active';
        }

        if ($this->hasReachedDailyLimit($userId)) {
            $reasons[] = 'Limite quotidienne atteinte';
        }

        if ($this->hasReachedWeeklyLimit($userId)) {
            $reasons[] = 'Limite hebdomadaire atteinte';
        }

        if ($this->hasReachedMonthlyLimit($userId)) {
            $reasons[] = 'Limite mensuelle atteinte';
        }

        if ($this->hasReachedTotalLimit($userId)) {
            $reasons[] = 'Limite totale atteinte';
        }

        // Vérifier le niveau utilisateur si fourni
        if ($user && $user->level < $this->min_user_level) {
            $reasons[] = "Niveau {$this->min_user_level} requis";
        }

        return [
            'canComplete' => empty($reasons),
            'reasons' => $reasons
        ];
    }

    /**
     * ✅ MÉTHODES UTILITAIRES - AFFICHAGE
     */

    /**
     * Obtenir la couleur CSS selon la difficulté
     */
    public function getDifficultyColorAttribute(): string
    {
        return match($this->difficulty) {
            self::DIFFICULTY_EASY => 'green',
            self::DIFFICULTY_MEDIUM => 'yellow',
            self::DIFFICULTY_HARD => 'red',
            default => 'gray'
        };
    }

    /**
     * Obtenir la description de la catégorie
     */
    public function getCategoryDescriptionAttribute(): string
    {
        return match($this->category) {
            self::CATEGORY_SOCIAL => 'Réseaux sociaux',
            self::CATEGORY_REVIEW => 'Avis et évaluations',
            self::CATEGORY_REFERRAL => 'Parrainage',
            self::CATEGORY_COMMUNITY => 'Communauté',
            self::CATEGORY_CONTENT => 'Création de contenu',
            default => 'Autre'
        };
    }

    /**
     * Obtenir le statut pour un utilisateur spécifique
     */
    public function getStatusForUser(int $userId): string
    {
        $check = $this->canBeCompletedBy($userId);
        
        if (!$check['canComplete']) {
            if (in_array('Période de cooldown active', $check['reasons'])) {
                return 'cooldown';
            }
            if (str_contains(implode(' ', $check['reasons']), 'Limite')) {
                return 'limit_reached';
            }
            return 'unavailable';
        }

        // Vérifier s'il y a une complétion en attente
        $pendingCompletion = $this->userCompletions()
            ->where('user_id', $userId)
            ->where('validation_status', 'pending')
            ->exists();

        if ($pendingCompletion) {
            return 'pending_validation';
        }

        // Vérifier s'il y a déjà une complétion approuvée récente
        $recentCompletion = $this->userCompletions()
            ->where('user_id', $userId)
            ->where('validation_status', 'approved')
            ->where('completed_at', '>=', now()->subDay())
            ->exists();

        if ($recentCompletion && $this->max_per_day === 1) {
            return 'completed';
        }

        return 'available';
    }

    /**
     * ✅ MÉTHODES STATIQUES
     */

    /**
     * Trouver une action par sa clé
     */
    public static function findByKey(string $actionKey): ?self
    {
        return self::where('action_key', $actionKey)->first();
    }

    /**
     * Obtenir les actions disponibles pour un utilisateur
     */
    public static function getAvailableForUser(int $userId, ?User $user = null): \Illuminate\Database\Eloquent\Collection
    {
        return self::available()
            ->ordered()
            ->get()
            ->filter(function ($action) use ($userId, $user) {
                $check = $action->canBeCompletedBy($userId, $user);
                return $check['canComplete'];
            });
    }

    /**
     * Obtenir toutes les actions formatées pour le frontend
     */
    public static function getForFrontend(int $userId = null): array
    {
        return self::available()
            ->ordered()
            ->get()
            ->map(function ($action) use ($userId) {
                $data = [
                    'id' => $action->action_key,
                    'title' => $action->title,
                    'description' => $action->description,
                    'creditsReward' => $action->credits_reward,
                    'estimatedTime' => $action->estimated_time,
                    'difficulty' => $action->difficulty,
                    'category' => $action->category,
                    'requirements' => $action->requirements,
                    'validationMethod' => $action->validation_method,
                    'cooldownPeriod' => $action->cooldown_period,
                    'maxPerDay' => $action->max_per_day,
                    'icon' => $action->icon_name,
                    'redirectUrl' => $action->redirect_url,
                    'openInNewTab' => $action->open_in_new_tab,
                ];

                if ($userId) {
                    $data['status'] = $action->getStatusForUser($userId);
                    $canComplete = $action->canBeCompletedBy($userId);
                    $data['canComplete'] = $canComplete['canComplete'];
                    $data['reasons'] = $canComplete['reasons'];
                }

                return $data;
            })
            ->toArray();
    }

    /**
     * ✅ ÉVÉNEMENTS DE MODÈLE
     */
    protected static function booted()
    {
        // Mettre à jour les statistiques lors de nouvelles complétions
        static::updating(function ($action) {
            if ($action->isDirty('total_completions') || $action->isDirty('pending_validations')) {
                $total = $action->total_completions + $action->pending_validations;
                $completed = $action->total_completions;
                
                if ($total > 0) {
                    $action->completion_rate = ($completed / $total) * 100;
                }
            }
        });
    }
}