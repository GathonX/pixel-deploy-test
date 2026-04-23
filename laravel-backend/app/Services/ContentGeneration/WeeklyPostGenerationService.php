<?php

namespace App\Services\ContentGeneration;

use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\UserSite;
use App\Services\ContentGeneration\ContentGenerationService;
use App\Services\ContentGeneration\SocialMediaGenerationRulesService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class WeeklyPostGenerationService
{
    private ContentGenerationService $contentGenerationService;
    private SocialMediaGenerationRulesService $socialRulesService;

    public function __construct(
        ContentGenerationService $contentGenerationService,
        SocialMediaGenerationRulesService $socialRulesService
    ) {
        $this->contentGenerationService = $contentGenerationService;
        $this->socialRulesService = $socialRulesService;
    }

    /**
     * ✅ CORRIGÉ : Générer post du jour selon fonctionnalités ACTIVÉES uniquement
     */
    public function generateTodayPostOnly(User $user): array
    {
        try {
            $today = Carbon::now();
            $dayInfo = [
                'date' => $today,
                'day_name' => strtolower($today->format('l')),
                'is_today' => true,
                'status' => 'published'
            ];

            Log::info("📅 [TODAY] Génération post du jour UNIQUEMENT", [
                'user_id' => $user->id,
                'date' => $today->format('Y-m-d'),
                'day' => $dayInfo['day_name']
            ]);

            // ✅ MODIFIÉ : Récupérer à la fois l'accès ET l'access_id
            $blogAccess = $this->hasActiveFeature($user, 'blog');
            $socialAccess = $this->hasActiveFeature($user, 'social_media');

            Log::info("🔍 [TODAY] Vérification accès fonctionnalités", [
                'user_id' => $user->id,
                'blog_access' => $blogAccess['has_access'],
                'blog_access_id' => $blogAccess['access_id'],
                'social_access' => $socialAccess['has_access'],
                'social_access_id' => $socialAccess['access_id']
            ]);

            $results = [
                'blog_posts' => [],
                'social_posts' => []
            ];

            // 1. ✅ Générer blog SEULEMENT si fonctionnalité blog activée
            if ($blogAccess['has_access']) {
                $existingBlog = BlogPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereDate('created_at', $today->format('Y-m-d'))
                    ->exists();

                if (!$existingBlog) {
                    Log::info("📝 [TODAY] Génération blog post du jour", [
                        'user_id' => $user->id,
                        'access_id' => $blogAccess['access_id']
                    ]);

                    $blogResult = $this->generateSingleBlogPost($user, $dayInfo, $blogAccess['access_id']);
                    if ($blogResult['success']) {
                        $results['blog_posts'][] = $blogResult['data'];
                        Log::info("✅ [TODAY] Blog post généré", [
                            'user_id' => $user->id,
                            'post_id' => $blogResult['data']->id,
                            'access_id' => $blogAccess['access_id']
                        ]);
                    }
                }
            } else {
                Log::info("⚠️ [TODAY] Blog non activé - pas de génération", [
                    'user_id' => $user->id
                ]);
            }

            // 2. ✅ Générer social SEULEMENT si fonctionnalité social_media activée
            if ($socialAccess['has_access']) {
                // ✅ NOUVEAU : Utiliser les règles exactes selon le jour d'activation
                $nextPlatform = $this->socialRulesService->getNextPlatformToGenerate($user);
                
                if ($nextPlatform) {
                    $existingSocial = SocialMediaPost::where('user_id', $user->id)
                        ->where('is_ai_generated', true)
                        ->whereDate('created_at', $today->format('Y-m-d'))
                        ->where('platform', $nextPlatform)
                        ->exists();

                    if (!$existingSocial) {
                        Log::info("📱 [TODAY] Génération social post du jour avec nouvelles règles", [
                            'user_id' => $user->id,
                            'platform' => $nextPlatform,
                            'access_id' => $socialAccess['access_id']
                        ]);

                        $socialResult = $this->generateSingleSocialPost($user, $nextPlatform, $dayInfo, $socialAccess['access_id']);
                        if ($socialResult['success']) {
                            $results['social_posts'][] = $socialResult['data'];
                            Log::info("✅ [TODAY] Social post généré avec nouvelles règles", [
                                'user_id' => $user->id,
                                'platform' => $nextPlatform,
                                'post_id' => $socialResult['data']->id,
                                'access_id' => $socialAccess['access_id']
                            ]);
                        }
                    } else {
                        Log::info("ℹ️ [TODAY] Pas de plateforme à générer aujourd'hui", [
                            'user_id' => $user->id
                        ]);
                    }
                }
            } else {
                Log::info("⚠️ [TODAY] Social Media non activé - pas de génération", [
                    'user_id' => $user->id
                ]);
            }

            return [
                'success' => true,
                'data' => $results
            ];

        } catch (\Exception $e) {
            Log::error("💥 [TODAY] Erreur génération post du jour", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur génération post du jour: ' . $e->getMessage()
            ];
        }
    }

    /**
     * ✅ MODIFIÉ : Retourne à la fois le statut ET l'access_id pour lier les posts
     */
    /**
     * Vérifie si un user a un site PRO actif lui donnant accès à la fonctionnalité IA (blog ou social_media).
     * Selon OFFER.md : blog auto IA et social IA sont exclusivement plan PRO.
     */
    private function hasActiveFeature(User $user, string $featureKey): array
    {
        $proFeatures = ['blog', 'social_media'];
        if (!in_array($featureKey, $proFeatures)) {
            return ['has_access' => false, 'access_id' => null];
        }

        $site = UserSite::where('user_id', $user->id)
            ->whereHas('planAssignment', function($q) {
                $q->where('effective_plan_key', 'pro')
                  ->where('status', 'active')
                  ->where(function($q2) {
                      $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                  });
            })
            ->first();

        $hasAccess = !!$site;

        Log::info("🔍 [ACCESS] Vérification plan PRO", [
            'user_id'      => $user->id,
            'feature_key'  => $featureKey,
            'has_access'   => $hasAccess,
            'site_id'      => $site?->id,
        ]);

        return [
            'has_access' => $hasAccess,
            'access_id'  => null, // plus utilisé, gardé pour compatibilité de signature
            'site_id'    => $site?->id,
        ];
    }

    /**
     * ✅ CORRIGÉ : Génération progressive selon fonctionnalité demandée
     */
    private function getNextContentToGenerate(User $user, string $featureKey): ?array
    {
        try {
            Log::info("🔍 [PROGRESSIVE] Recherche contenu suivant avec distribution intelligente", [
                'user_id' => $user->id,
                'feature_key' => $featureKey
            ]);

            // ✅ SOLUTION PERMANENTE : Obtenir le planning de distribution optimal
            $distributionPlan = $this->getOptimalDistributionPlan($user, $featureKey);
            
            if (empty($distributionPlan)) {
                Log::info("ℹ️ [PROGRESSIVE] Aucune date disponible dans le planning", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey
                ]);
                return null;
            }

            // ✅ PRENDRE LA PREMIÈRE DATE DISPONIBLE DU PLANNING
            $nextSlot = $distributionPlan[0];
            
            Log::info("🎯 [PROGRESSIVE] Slot suivant identifié", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'date' => $nextSlot['date']->format('Y-m-d'),
                'type' => $nextSlot['type'],
                'platform' => $nextSlot['platform'] ?? 'N/A'
            ]);

            return [
                'type' => $nextSlot['type'],
                'platform' => $nextSlot['platform'] ?? null,
                'date' => $nextSlot['date'],
                'day_name' => strtolower($nextSlot['date']->format('l')),
                'is_today' => $nextSlot['date']->isToday(),
                'status' => 'scheduled' // ✅ CORRECTION : Tous les posts progressifs sont scheduled
            ];

        } catch (\Exception $e) {
            Log::error("💥 [PROGRESSIVE] Erreur recherche contenu suivant", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return null;
        }
    }

    /**
     * ✅ SOLUTION PERMANENTE : Génère un planning optimal de distribution LIMITÉ à 6 posts restants
     */
    private function getOptimalDistributionPlan(User $user, string $featureKey): array
    {
        try {
            $activationDate = $this->getActivationDate($user, $featureKey);
            $endOfWeek = $activationDate->copy()->endOfWeek();

            $plan = [];
            // ✅ CORRECTION BUG LUNDI : Commencer à 00:00 du jour d'activation pour parcourir TOUS les jours
            $currentDate = $activationDate->copy()->startOfDay();
            
            Log::info("📋 [DISTRIBUTION] Génération planning optimal LIMITÉ", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'start_date' => $activationDate->format('Y-m-d'),
                'end_date' => $endOfWeek->format('Y-m-d'),
                'max_posts_target' => 6 // ✅ NOUVEAU : Limite maximale
            ]);

            // ✅ CORRECTION CRITIQUE : Compter les posts déjà générés pour cette fonctionnalité
            $alreadyGenerated = $this->countGeneratedPostsThisWeek($user, $featureKey);
            $maxPosts = 7; // Total maximum par fonctionnalité
            $remainingSlots = $maxPosts - $alreadyGenerated;

            Log::info("📊 [DISTRIBUTION] Vérification limite posts", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'already_generated' => $alreadyGenerated,
                'max_posts_total' => $maxPosts,
                'remaining_slots' => $remainingSlots
            ]);

            if ($remainingSlots <= 0) {
                Log::info("⚠️ [DISTRIBUTION] Limite de posts atteinte pour cette semaine", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'posts_generated' => $alreadyGenerated,
                    'max_allowed' => $maxPosts
                ]);
                return [];
            }

            $slotsAdded = 0;

            while ($currentDate <= $endOfWeek && $slotsAdded < $remainingSlots) {
                $dateStr = $currentDate->format('Y-m-d');
                
                // ✅ STRATÉGIE ANTI-DOUBLON : Vérifier les créneaux manquants par ordre de priorité
                if ($featureKey === 'blog') {
                    if (!$this->hasContentForDate($user, 'blog', $dateStr)) {
                        $plan[] = [
                            'type' => 'blog',
                            'date' => $currentDate->copy(),
                            'priority' => $this->calculateDatePriority($currentDate)
                        ];
                        $slotsAdded++;
                    }
                }
                
                if ($featureKey === 'social_media') {
                    // ✅ NOUVEAU : Utiliser les règles exactes selon le jour d'activation
                    $nextPlatform = $this->socialRulesService->getNextPlatformToGenerate($user);
                    if ($nextPlatform) {
                        $priority = $this->calculateDatePriority($currentDate);
                        
                        $plan[] = [
                            'type' => 'social',
                            'platform' => $nextPlatform,
                            'date' => $currentDate->copy(),
                            'priority' => $priority
                        ];
                        
                        $slotsAdded++;
                        
                        Log::info("📱 [PLANNING] Slot social ajouté", [
                            'user_id' => $user->id,
                            'platform' => $availablePlatform,
                            'date' => $dateStr,
                            'priority' => $priority,
                            'slots_added' => $slotsAdded,
                            'remaining_slots' => $remainingSlots,
                            'is_required' => in_array($availablePlatform, $missingPlatforms)
                        ]);
                    }
                }
                
                $currentDate->addDay();
            }
            
            // ✅ TRIER PAR PRIORITÉ (dates proches d'abord)
            usort($plan, function($a, $b) {
                return $a['priority'] <=> $b['priority'];
            });
            
            // ✅ RÉSUMÉ : Vérifier garantie des 4 plateformes pour social_media
            $planSummary = [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'already_generated' => $alreadyGenerated,
                'slots_available' => count($plan),
                'max_posts_total' => $maxPosts,
                'remaining_capacity' => $remainingSlots,
                'next_slot' => !empty($plan) ? $plan[0]['date']->format('Y-m-d') : 'none'
            ];
            
            if ($featureKey === 'social_media') {
                $requiredSlots = array_filter($plan, fn($slot) => $slot['is_required_platform'] ?? false);
                $plannedPlatforms = array_unique(array_column($plan, 'platform'));
                
                $planSummary['planned_platforms'] = $plannedPlatforms;
                $planSummary['required_slots'] = count($requiredSlots);
                $planSummary['garantie_4_plateformes'] = count($plannedPlatforms) >= 4 ? 'GARANTIE' : 'PARTIELLE';
            }
            
            Log::info("✅ [DISTRIBUTION] Planning généré avec LIMITE", $planSummary);
            
            return $plan;
            
        } catch (\Exception $e) {
            Log::error("💥 [DISTRIBUTION] Erreur génération planning", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }
    
    /**
     * ✅ NOUVEAU : Compter les posts générés cette semaine pour une fonctionnalité
     */
    private function countGeneratedPostsThisWeek(User $user, string $featureKey): int
    {
        $activationDate = $this->getActivationDate($user, $featureKey);
        $endOfWeek = $activationDate->copy()->endOfWeek();
        
        if ($featureKey === 'blog') {
            return BlogPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$activationDate, $endOfWeek])
                ->count();
        }
        
        if ($featureKey === 'social_media') {
            return SocialMediaPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$activationDate, $endOfWeek])
                ->count();
        }
        
        return 0;
    }
    
    /**
     * ✅ UTILITAIRE : Vérifier si du contenu existe pour une date donnée
     */
    private function hasContentForDate(User $user, string $contentType, string $dateStr): bool
    {
        if ($contentType === 'blog') {
            return BlogPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereDate('created_at', $dateStr)
                ->exists();
        }
        
        return false;
    }
    
    /**
     * ✅ SOLUTION PERMANENTE : Garantir distribution équilibrée des 4 plateformes sur 7 posts
     */
    private function getAvailablePlatformForDate(User $user, string $dateStr): ?string
    {
        $platforms = ['linkedin', 'facebook', 'instagram', 'twitter'];
        
        // ✅ 1. Vérifier d'abord les plateformes manquantes sur toute la semaine
        $missingPlatforms = $this->getMissingPlatformsForWeek($user);
        
        if (!empty($missingPlatforms)) {
            // ✅ PRIORITÉ : Plateformes encore jamais générées cette semaine
            foreach ($missingPlatforms as $platform) {
                $existsToday = SocialMediaPost::where('user_id', $user->id)
                    ->where('platform', $platform)
                    ->where('is_ai_generated', true)
                    ->whereDate('created_at', $dateStr)
                    ->exists();
                    
                if (!$existsToday) {
                    Log::info("🎯 [DISTRIBUTION] Plateforme prioritaire sélectionnée", [
                        'user_id' => $user->id,
                        'platform' => $platform,
                        'reason' => 'missing_from_week',
                        'date' => $dateStr
                    ]);
                    
                    return $platform;
                }
            }
        }
        
        // ✅ 2. Si toutes les plateformes sont représentées, distribution aléatoire
        $shuffledPlatforms = $platforms;
        shuffle($shuffledPlatforms);
        
        foreach ($shuffledPlatforms as $platform) {
            $existsToday = SocialMediaPost::where('user_id', $user->id)
                ->where('platform', $platform)
                ->where('is_ai_generated', true)
                ->whereDate('created_at', $dateStr)
                ->exists();
                
            if (!$existsToday) {
                Log::info("🎲 [DISTRIBUTION] Plateforme aléatoire sélectionnée", [
                    'user_id' => $user->id,
                    'platform' => $platform,
                    'reason' => 'random_distribution',
                    'date' => $dateStr
                ]);
                
                return $platform;
            }
        }
        
        return null;
    }
    
    /**
     * ✅ NOUVEAU : Identifier plateformes manquantes pour la semaine en cours
     */
    private function getMissingPlatformsForWeek(User $user): array
    {
        $allPlatforms = ['linkedin', 'facebook', 'instagram', 'twitter'];
        
        // Obtenir la date d'activation pour déterminer la période
        $activationDate = $this->getActivationDate($user, 'social_media');
        $endOfWeek = $activationDate->copy()->endOfWeek();
        
        // Récupérer les plateformes déjà générées cette semaine
        $generatedPlatforms = SocialMediaPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->whereBetween('created_at', [$activationDate, $endOfWeek])
            ->distinct('platform')
            ->pluck('platform')
            ->toArray();
            
        $missingPlatforms = array_diff($allPlatforms, $generatedPlatforms);
        
        Log::info("📋 [DISTRIBUTION] Analyse plateformes semaine", [
            'user_id' => $user->id,
            'activation_date' => $activationDate->format('Y-m-d'),
            'end_of_week' => $endOfWeek->format('Y-m-d'),
            'all_platforms' => $allPlatforms,
            'generated_platforms' => $generatedPlatforms,
            'missing_platforms' => array_values($missingPlatforms),
            'missing_count' => count($missingPlatforms),
            'garantie_4_plateformes' => count($missingPlatforms) > 0 ? 'ACTIVE' : 'COMPLETED'
        ]);
        
        return array_values($missingPlatforms);
    }
    
    /**
     * ✅ UTILITAIRE : Calculer priorité d'une date (plus proche = priorité plus haute)
     */
    private function calculateDatePriority(Carbon $date): int
    {
        $now = Carbon::now();
        
        if ($date->isToday()) {
            return 1; // Priorité maximale pour aujourd'hui
        }
        
        if ($date->isPast()) {
            return 0; // Priorité minimale pour dates passées
        }
        
        // Priorité inversement proportionnelle à la distance
        return max(2, 10 - $now->diffInDays($date));
    }

    /**
     * ✅ NOUVEAU : Obtenir date d'activation d'une fonctionnalité
     */
    private function getActivationDate(User $user, string $featureKey): Carbon
    {
        $access = UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                $query->where('key', $featureKey);
            })
            ->where('user_id', $user->id)
            ->first();

        if ($access && $access->user_activated_at) {
            $activationDate = Carbon::parse($access->user_activated_at);

            Log::info("📅 [ACTIVATION] Date d'activation trouvée", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'activation_date' => $activationDate->format('Y-m-d'),
                'day_of_week' => $activationDate->format('l')
            ]);

            return $activationDate;
        }

        // Fallback : aujourd'hui si pas de date d'activation
        Log::warning("⚠️ [ACTIVATION] Pas de date d'activation, utilisation d'aujourd'hui", [
            'user_id' => $user->id,
            'feature_key' => $featureKey
        ]);

        return Carbon::now();
    }

    /**
     * ✅ MODIFIÉ : Blog post avec user_feature_access_id
     */
    public function generateSingleBlogPost(User $user, array $dayInfo, ?int $accessId = null, ?string $siteId = null): array
    {
        try {
            Log::info("📝 [BLOG] Début génération blog post", [
                'user_id' => $user->id,
                'date' => $dayInfo['date']->format('Y-m-d'),
                'day' => $dayInfo['day_name'],
                'access_id' => $accessId,
                'access_id_is_null' => $accessId === null
            ]);

            // Utiliser le nouveau système d'objectifs
            $blogResult = $this->contentGenerationService->generateBlogContent($user);

            if ($blogResult['success']) {
                // ✅ CORRECTION : Date de publication selon le statut
                $publishedAt = null;
                if ($dayInfo['status'] === 'published') {
                    $publishedAt = $dayInfo['date'];
                } elseif ($dayInfo['status'] === 'scheduled') {
                    // ✅ CORRECTION : Utiliser la date déjà configurée avec la bonne heure
                    $publishedAt = $dayInfo['date'];
                }

                // ✅ CRITIQUE : Nettoyer les émojis pour éviter les erreurs UTF-8
                $cleanTitle = $this->removeEmojis($blogResult['data']['title']);
                $cleanSummary = $this->removeEmojis($blogResult['data']['summary']);
                $cleanContent = $this->removeEmojis($blogResult['data']['content']);

                // ✅ NOUVEAU : Calculer hash du contenu pour éviter doublons
                $contentHash = hash('sha256', $cleanTitle . $cleanContent);

                // ✅ ANTI-DOUBLONS : Vérifier si contenu identique existe déjà
                $duplicateContent = BlogPost::where('user_id', $user->id)
                    ->where('content_hash', $contentHash)
                    ->exists();

                if ($duplicateContent) {
                    Log::warning("🚫 [BLOG] Contenu identique détecté - régénération", [
                        'user_id' => $user->id,
                        'content_hash' => $contentHash
                    ]);

                    // Régénérer avec un nouveau contenu
                    $blogResult = $this->contentGenerationService->generateBlogContent($user);
                    if ($blogResult['success']) {
                        $cleanTitle = $this->removeEmojis($blogResult['data']['title']);
                        $cleanSummary = $this->removeEmojis($blogResult['data']['summary']);
                        $cleanContent = $this->removeEmojis($blogResult['data']['content']);
                        $contentHash = hash('sha256', $cleanTitle . $cleanContent);
                    }
                }

                // ✅ MODIFIÉ : Ajouter user_feature_access_id + content_hash
                $blogPost = new BlogPost([
                    'user_id' => $user->id,
                    'site_id' => $siteId,
                    'user_feature_access_id' => $accessId, // gardé pour compatibilité
                    'slug' => $this->generateUniqueSlug($cleanTitle),
                    'title' => $cleanTitle, // ✅ CORRECTION : Titre sans émojis
                    'summary' => $cleanSummary, // ✅ CORRECTION : Résumé sans émojis
                    'content' => $cleanContent, // ✅ CORRECTION : Contenu sans émojis
                    'content_hash' => $contentHash, // ✅ NOUVEAU : Hash pour anti-doublons
                    'header_image' => $blogResult['data']['header_image'],
                    'status' => $dayInfo['status'],
                    'published_at' => $publishedAt,
                    'scheduled_at' => $dayInfo['status'] === 'scheduled' ? $dayInfo['date'] : null,
                    'scheduled_time' => $dayInfo['status'] === 'scheduled' ? $dayInfo['date']->format('H:i:s') : null,
                    'is_ai_generated' => true,
                    'generation_context' => isset($blogResult['data']['generation_context']) ? $blogResult['data']['generation_context'] : json_encode([]),
                    'tags' => isset($blogResult['data']['tags']) ? $blogResult['data']['tags'] : []
                ]);
                
                // ✅ CORRECTION PERMANENTE : Définir created_at = published_at pour cohérence
                // Pour les posts IA, created_at doit correspondre à la date de publication prévue
                $targetDate = $publishedAt ? $publishedAt->copy() : $dayInfo['date']->copy();
                $blogPost->created_at = $targetDate;
                $blogPost->updated_at = $targetDate;
                $blogPost->save();

                Log::info("✅ [BLOG] Blog post créé avec succès", [
                    'user_id' => $user->id,
                    'post_id' => $blogPost->id,
                    'title' => $blogPost->title,
                    'status' => $blogPost->status,
                    'published_at' => $publishedAt ? $publishedAt->format('Y-m-d H:i:s') : 'NULL'
                ]);

                return [
                    'success' => true,
                    'data' => $blogPost
                ];
            }

            Log::error("❌ [BLOG] Échec génération contenu blog", [
                'user_id' => $user->id,
                'error' => isset($blogResult['error']) ? $blogResult['error'] : 'Erreur inconnue'
            ]);

            return [
                'success' => false,
                'error' => 'Échec génération blog post'
            ];

        } catch (\Exception $e) {
            Log::error("💥 [BLOG] Exception génération blog post", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur génération blog: ' . $e->getMessage()
            ];
        }
    }

    /**
     * ✅ MODIFIÉ : Social post avec user_feature_access_id
     */
    public function generateSingleSocialPost(User $user, string $platform, array $dayInfo, ?int $accessId = null, ?string $siteId = null): array
    {
        try {
            Log::info("📱 [SOCIAL] Début génération social post", [
                'user_id' => $user->id,
                'platform' => $platform,
                'date' => $dayInfo['date']->format('Y-m-d'),
                'day' => $dayInfo['day_name']
            ]);

            // Utiliser le nouveau système d'objectifs
            $socialResult = $this->contentGenerationService->generateSocialContent($user, $platform);

            if ($socialResult['success']) {
                // ✅ CORRECTION : Date de publication selon le statut
                $publishedAt = null;
                if ($dayInfo['status'] === 'published') {
                    $publishedAt = $dayInfo['date'];
                } elseif ($dayInfo['status'] === 'scheduled') {
                    // ✅ CORRECTION : Utiliser la date déjà configurée avec la bonne heure
                    $publishedAt = $dayInfo['date'];
                }

                // ✅ CRITIQUE : Nettoyer les émojis pour éviter les erreurs UTF-8
                $cleanContent = $this->removeEmojis($socialResult['data']['content']);

                // ✅ NOUVEAU : Calculer hash du contenu pour éviter doublons
                $contentHash = hash('sha256', $cleanContent);

                // ✅ ANTI-DOUBLONS : Vérifier si contenu identique existe déjà
                $duplicateContent = SocialMediaPost::where('user_id', $user->id)
                    ->where('content_hash', $contentHash)
                    ->where('platform', $platform)
                    ->exists();

                if ($duplicateContent) {
                    Log::warning("🚫 [SOCIAL] Contenu identique détecté - régénération", [
                        'user_id' => $user->id,
                        'platform' => $platform,
                        'content_hash' => $contentHash
                    ]);

                    // Régénérer avec un nouveau contenu
                    $socialResult = $this->contentGenerationService->generateSocialContent($user, $platform);
                    if ($socialResult['success']) {
                        $cleanContent = $this->removeEmojis($socialResult['data']['content']);
                        $contentHash = hash('sha256', $cleanContent);
                    }
                }

                // ✅ MODIFIÉ : Ajouter user_feature_access_id + content_hash
                $socialPost = new SocialMediaPost([
                    'user_id' => $user->id,
                    'site_id' => $siteId,
                    'user_feature_access_id' => $accessId, // gardé pour compatibilité
                    'platform' => $platform,
                    'content' => $cleanContent, // ✅ CORRECTION : Contenu sans émojis
                    'content_hash' => $contentHash, // ✅ NOUVEAU : Hash pour anti-doublons
                    'images' => isset($socialResult['data']['images']) ? $socialResult['data']['images'] : [],
                    'status' => $dayInfo['status'],
                    'published_at' => $publishedAt,
                    'scheduled_time' => $dayInfo['status'] === 'scheduled' ? $dayInfo['date']->format('H:i:s') : null,
                    'is_ai_generated' => true,
                    'generation_context' => isset($socialResult['data']['generation_context']) ? $socialResult['data']['generation_context'] : json_encode([]),
                    'tags' => isset($socialResult['data']['hashtags']) ? $socialResult['data']['hashtags'] : []
                ]);
                
                // ✅ CORRECTION PERMANENTE : Définir created_at = published_at pour cohérence
                // Pour les posts IA, created_at doit correspondre à la date de publication prévue
                $targetDate = $publishedAt ? $publishedAt->copy() : $dayInfo['date']->copy();
                $socialPost->created_at = $targetDate;
                $socialPost->updated_at = $targetDate;
                $socialPost->save();

                Log::info("✅ [SOCIAL] Social post créé avec succès", [
                    'user_id' => $user->id,
                    'post_id' => $socialPost->id,
                    'platform' => $platform,
                    'status' => $socialPost->status,
                    'published_at' => $publishedAt ? $publishedAt->format('Y-m-d H:i:s') : 'NULL'
                ]);

                return [
                    'success' => true,
                    'data' => $socialPost
                ];
            }

            Log::error("❌ [SOCIAL] Échec génération contenu social", [
                'user_id' => $user->id,
                'platform' => $platform,
                'error' => isset($socialResult['error']) ? $socialResult['error'] : 'Erreur inconnue'
            ]);

            return [
                'success' => false,
                'error' => 'Échec génération social post'
            ];

        } catch (\Exception $e) {
            Log::error("💥 [SOCIAL] Exception génération social post", [
                'user_id' => $user->id,
                'platform' => $platform,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur génération social: ' . $e->getMessage()
            ];
        }
    }

    // ✅ Conserver les autres méthodes utilitaires sans changement
    private function generateUniqueSlug(string $title): string
    {
        $baseSlug = \Illuminate\Support\Str::slug($title);
        $slug = $baseSlug;
        $counter = 1;

        while (BlogPost::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    // ✅ Méthodes héritées conservées pour compatibilité
    public function generateSinglePost(User $user, string $featureKey): array
    {
        return $this->generateSingleRemainingPost($user, $featureKey);
    }

    public function generateInitialPosts(User $user): array
    {
        Log::info("🎯 [INITIAL] Génération posts initiaux", [
            'user_id' => $user->id
        ]);

        return $this->generateTodayPostOnly($user);
    }

    public function needsGeneration(User $user): bool
    {
        if ($user->created_at->diffInHours(Carbon::now()) < 24) {
            return !$this->hasAnyPosts($user);
        }

        return !$this->hasPostsThisWeek($user);
    }

    private function hasAnyPosts(User $user): bool
    {
        $hasBlog = BlogPost::where('user_id', $user->id)->exists();
        $hasSocial = SocialMediaPost::where('user_id', $user->id)->exists();

        return $hasBlog || $hasSocial;
    }

    private function hasPostsThisWeek(User $user): bool
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        $weeklyBlogPosts = BlogPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->count();

        $weeklySocialPosts = SocialMediaPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->count();

        $totalPosts = $weeklyBlogPosts + $weeklySocialPosts;

        return $totalPosts >= 5;
    }

    /**
     * ✅ NOUVEAU : Génération hebdomadaire complète pour régénération lundi
     * Génère 7 blog posts + 7 social media posts selon les règles
     */
    public function generateWeeklyRegeneration(User $user): array
    {
        try {
            Log::info("📅 [WEEKLY] Démarrage régénération hebdomadaire", [
                'user_id' => $user->id,
                'week' => now()->format('Y-W'),
                'date' => now()->format('Y-m-d')
            ]);

            // ✅ MODIFIÉ : Récupérer à la fois l'accès ET l'access_id
            $blogAccess = $this->hasActiveFeature($user, 'blog');
            $socialAccess = $this->hasActiveFeature($user, 'social_media');

            Log::info("🔍 [WEEKLY] Vérification accès régénération", [
                'user_id' => $user->id,
                'blog_access' => $blogAccess['has_access'],
                'blog_access_id' => $blogAccess['access_id'],
                'social_access' => $socialAccess['has_access'],
                'social_access_id' => $socialAccess['access_id']
            ]);

            $results = [
                'blog_posts' => [],
                'social_posts' => []
            ];

            // 1. ✅ Générer 7 blog posts si accès blog
            if ($blogAccess['has_access']) {
                $blogResults = $this->generateWeeklyBlogPosts($user, $blogAccess['access_id'], $blogAccess['site_id'] ?? null);
                $results['blog_posts'] = $blogResults;

                Log::info("📝 [WEEKLY] Blog posts générés", [
                    'user_id' => $user->id,
                    'count' => count($blogResults),
                    'access_id' => $blogAccess['access_id']
                ]);
            } else {
                Log::info("⚠️ [WEEKLY] Blog non activé - pas de génération blog", [
                    'user_id' => $user->id
                ]);
            }

            // 2. ✅ Générer 7 social posts si accès social
            if ($socialAccess['has_access']) {
                $socialResults = $this->generateWeeklySocialPosts($user, $socialAccess['access_id'], $socialAccess['site_id'] ?? null);
                $results['social_posts'] = $socialResults;

                Log::info("📱 [WEEKLY] Social posts générés", [
                    'user_id' => $user->id,
                    'count' => count($socialResults),
                    'access_id' => $socialAccess['access_id']
                ]);
            } else {
                Log::info("⚠️ [WEEKLY] Social Media non activé - pas de génération social", [
                    'user_id' => $user->id
                ]);
            }

            $totalPosts = count($results['blog_posts']) + count($results['social_posts']);

            Log::info("✅ [WEEKLY] Régénération hebdomadaire terminée", [
                'user_id' => $user->id,
                'blog_posts_count' => count($results['blog_posts']),
                'social_posts_count' => count($results['social_posts']),
                'total_posts' => $totalPosts,
                'week' => now()->format('Y-W')
            ]);

            return [
                'success' => true,
                'data' => $results,
                'message' => "Régénération hebdomadaire réussie: {$totalPosts} posts générés"
            ];

        } catch (\Exception $e) {
            Log::error("💥 [WEEKLY] Erreur régénération hebdomadaire", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur régénération: ' . $e->getMessage(),
                'data' => ['blog_posts' => [], 'social_posts' => []]
            ];
        }
    }

    /**
     * ✅ CORRIGÉ : Générer 7 blog posts avec dates UNIQUES (1 par jour) selon les règles
     * Règle blog : Lundi 1 published + 6 scheduled (mardi à dimanche)
     */
    private function generateWeeklyBlogPosts(User $user, ?int $accessId = null, ?string $siteId = null): array
    {
        $blogPosts = [];

        // ✅ Déterminer la semaine de génération
        $now = now();
        $baseTime = $now->copy()->startOfWeek(); // Toujours commencer au lundi de cette semaine

        Log::info("📅 [WEEKLY-BLOG] Période de génération déterminée", [
            'user_id' => $user->id,
            'current_date' => $now->format('Y-m-d H:i'),
            'generation_week_start' => $baseTime->format('Y-m-d'),
            'week_number' => $baseTime->format('Y-W')
        ]);

        // 🛡️ CORRECTION CRITIQUE : Vérifier par published_at (et non created_at) pour éviter les doublons de dates
        $existingBlogPosts = BlogPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->whereBetween('created_at', [$baseTime, $baseTime->copy()->endOfWeek()])
            ->get();

        // 🛡️ IMPORTANT : Extraire les dates de publication (published_at) pour vérifier les doublons
        $existingDates = $existingBlogPosts->pluck('published_at')->map(function($date) {
            return $date ? Carbon::parse($date)->format('Y-m-d') : null;
        })->filter()->unique()->toArray();

        Log::info("📊 [WEEKLY-BLOG] Analyse posts existants", [
            'user_id' => $user->id,
            'existing_count' => $existingBlogPosts->count(),
            'existing_dates' => $existingDates,
            'week' => $baseTime->format('Y-W')
        ]);

        // ✅ RÈGLE STRICTE : Générer 1 post par jour (Lundi à Dimanche = 7 posts)
        $daysOfWeek = [
            ['day_offset' => 0, 'day_name' => 'lundi', 'status' => 'published', 'hour' => 8],   // Lundi published
            ['day_offset' => 1, 'day_name' => 'mardi', 'status' => 'scheduled', 'hour' => 10],  // Mardi scheduled
            ['day_offset' => 2, 'day_name' => 'mercredi', 'status' => 'scheduled', 'hour' => 12],
            ['day_offset' => 3, 'day_name' => 'jeudi', 'status' => 'scheduled', 'hour' => 14],
            ['day_offset' => 4, 'day_name' => 'vendredi', 'status' => 'scheduled', 'hour' => 16],
            ['day_offset' => 5, 'day_name' => 'samedi', 'status' => 'scheduled', 'hour' => 18],
            ['day_offset' => 6, 'day_name' => 'dimanche', 'status' => 'scheduled', 'hour' => 20]
        ];

        foreach ($daysOfWeek as $dayConfig) {
            try {
                // ✅ Calculer la date exacte pour ce jour
                // ✅ CORRECTION: Tous les posts publiés à 06:00 (indépendant de l'heure de génération)
                $postDate = $baseTime->copy()
                    ->addDays($dayConfig['day_offset'])
                    ->setTime(6, 0, 0);

                $dateKey = $postDate->format('Y-m-d');

                // ✅ Vérifier si un post existe déjà pour cette date (vérification fraîche en DB pour éviter les race conditions)
                $alreadyExists = BlogPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereNotNull('published_at')
                    ->whereDate('published_at', $dateKey)
                    ->exists();
                if ($alreadyExists || in_array($dateKey, $existingDates)) {
                    Log::info("⏭️ [WEEKLY-BLOG] Post déjà existant pour " . $dayConfig['day_name'], [
                        'user_id' => $user->id,
                        'date' => $dateKey
                    ]);
                    continue;
                }

                // ✅ Ne pas générer de posts pour les dates passées
                if ($postDate->isPast() && !$postDate->isToday()) {
                    Log::info("⏭️ [WEEKLY-BLOG] Date passée ignorée : " . $dayConfig['day_name'], [
                        'user_id' => $user->id,
                        'date' => $dateKey
                    ]);
                    continue;
                }

                $dayInfo = [
                    'date' => $postDate,
                    'day_name' => $dayConfig['day_name'],
                    'is_today' => $postDate->isToday(),
                    'status' => $postDate->isToday() ? 'published' : $dayConfig['status']
                ];

                Log::info("📝 [WEEKLY-BLOG] Génération blog " . $dayConfig['day_name'], [
                    'user_id' => $user->id,
                    'post_date' => $postDate->format('Y-m-d H:i:s'),
                    'status' => $dayInfo['status'],
                    'access_id' => $accessId
                ]);

                $blogResult = $this->generateSingleBlogPost($user, $dayInfo, $accessId, $siteId);

                if ($blogResult['success'] && isset($blogResult['data'])) {
                    $blogPosts[] = $blogResult['data'];
                    Log::info("✅ [WEEKLY-BLOG] Post créé pour " . $dayConfig['day_name'], [
                        'user_id' => $user->id,
                        'post_id' => $blogResult['data']->id,
                        'date' => $dateKey
                    ]);
                } else {
                    Log::error("❌ [WEEKLY-BLOG] Échec " . $dayConfig['day_name'], [
                        'user_id' => $user->id,
                        'error' => $blogResult['error'] ?? 'Erreur inconnue'
                    ]);
                }

                // Pause entre générations
                usleep(500000); // 0.5 seconde

            } catch (\Exception $e) {
                Log::error("💥 [WEEKLY-BLOG] Exception " . $dayConfig['day_name'], [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info("✅ [WEEKLY-BLOG] Génération terminée", [
            'user_id' => $user->id,
            'posts_generated' => count($blogPosts),
            'week' => $baseTime->format('Y-W')
        ]);

        return $blogPosts;
    }

    /**
     * ✅ CORRIGÉ : Générer social posts selon règles progressives par jour
     * Règles : Lundi 7, Mardi 6, Mercredi 5, Jeudi 4, Vendredi 3, Samedi 2, Dimanche 1
     */
    private function generateWeeklySocialPosts(User $user, ?int $accessId = null, ?string $proSiteId = null): array
    {
        $socialPosts = [];

        // ✅ CRITIQUE : Récupérer les plateformes activées depuis UserFeatureAccess
        $site = UserSite::where('user_id', $user->id)
            ->whereHas('planAssignment', function($q) {
                $q->where('effective_plan_key', 'pro')
                  ->where('status', 'active')
                  ->where(function($q2) {
                      $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                  });
            })
            ->first();

        if (!$site) {
            Log::warning("⚠️ [WEEKLY-SOCIAL] Aucun site PRO actif - arrêt génération", ['user_id' => $user->id]);
            return [];
        }

        // Plateformes configurées sur le site ; par défaut toutes les 4 si pas encore configurées
        $defaultPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
        if (empty($site->social_enabled_platforms)) {
            // Premier lancement : activer toutes les plateformes et persister en DB
            $site->update(['social_enabled_platforms' => $defaultPlatforms]);
            $enabledPlatforms = $defaultPlatforms;
            Log::info("✅ [WEEKLY-SOCIAL] Plateformes initialisées par défaut", [
                'user_id' => $user->id, 'site_id' => $site->id, 'platforms' => $defaultPlatforms,
            ]);
        } else {
            $enabledPlatforms = $site->social_enabled_platforms;
        }

        if (empty($enabledPlatforms)) {
            Log::warning("⚠️ [WEEKLY-SOCIAL] Aucune plateforme activée - arrêt génération", [
                'user_id' => $user->id, 'site_id' => $site->id,
            ]);
            return [];
        }

        Log::info("🔐 [WEEKLY-SOCIAL] Plateformes autorisées récupérées", [
            'user_id' => $user->id,
            'enabled_platforms' => $enabledPlatforms,
            'access_id' => $accessId
        ]);

        // ✅ Déterminer la semaine de génération
        $now = now();
        $baseTime = $now->copy()->startOfWeek(); // Toujours commencer au lundi

        Log::info("📅 [WEEKLY-SOCIAL] Période de génération déterminée", [
            'user_id' => $user->id,
            'current_date' => $now->format('Y-m-d H:i'),
            'generation_week_start' => $baseTime->format('Y-m-d'),
            'week_number' => $baseTime->format('Y-W')
        ]);

        // 🛡️ CORRECTION CRITIQUE : Vérifier par published_at (et non created_at) pour éviter les doublons de dates
        $existingSocialPosts = SocialMediaPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->whereBetween('created_at', [$baseTime, $baseTime->copy()->endOfWeek()])
            ->get();

        // 🛡️ IMPORTANT : Grouper par date de publication (published_at) pour vérifier les doublons
        $existingByDate = $existingSocialPosts->groupBy(function($post) {
            return $post->published_at ? Carbon::parse($post->published_at)->format('Y-m-d') : null;
        });

        Log::info("📊 [WEEKLY-SOCIAL] Analyse posts existants", [
            'user_id' => $user->id,
            'existing_count' => $existingSocialPosts->count(),
            'dates_with_posts' => $existingByDate->keys()->toArray(),
            'week' => $baseTime->format('Y-W')
        ]);

        /**
         * ✅ RÈGLES STRICTES PAR JOUR - FILTRÉES PAR PLATEFORMES ACTIVÉES
         * On génère X posts par jour en utilisant SEULEMENT les plateformes activées
         * Rotation cyclique sur les plateformes activées
         */
        $postsPerDay = [7, 6, 5, 4, 3, 2, 1]; // Lundi->Dimanche
        $dayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

        $weeklyPlan = [];
        for ($dayOffset = 0; $dayOffset < 7; $dayOffset++) {
            $targetPostCount = $postsPerDay[$dayOffset];
            $platformsForDay = [];

            // ✅ CRITIQUE : Générer rotation sur SEULEMENT les plateformes activées
            for ($i = 0; $i < $targetPostCount; $i++) {
                $platformIndex = $i % count($enabledPlatforms);
                $platformsForDay[] = $enabledPlatforms[$platformIndex];
            }

            $weeklyPlan[$dayOffset] = [
                'platforms' => $platformsForDay,
                'day_name' => $dayNames[$dayOffset]
            ];
        }

        Log::info("📋 [WEEKLY-SOCIAL] Plan hebdomadaire généré avec plateformes activées", [
            'user_id' => $user->id,
            'enabled_platforms' => $enabledPlatforms,
            'weekly_plan' => array_map(function($day) {
                return [
                    'day' => $day['day_name'],
                    'posts_count' => count($day['platforms']),
                    'platforms' => $day['platforms']
                ];
            }, $weeklyPlan)
        ]);

        foreach ($weeklyPlan as $dayOffset => $dayConfig) {
            $postDate = $baseTime->copy()->addDays($dayOffset);
            $dateKey = $postDate->format('Y-m-d');

            // ✅ Ne pas générer pour dates passées
            if ($postDate->isPast() && !$postDate->isToday()) {
                Log::info("⏭️ [WEEKLY-SOCIAL] Date passée ignorée : " . $dayConfig['day_name'], [
                    'user_id' => $user->id,
                    'date' => $dateKey
                ]);
                continue;
            }

            // ✅ Compter posts existants pour ce jour
            $existingCountForDay = $existingByDate->get($dateKey, collect())->count();
            $targetCount = count($dayConfig['platforms']);

            if ($existingCountForDay >= $targetCount) {
                Log::info("⏭️ [WEEKLY-SOCIAL] Quota atteint pour " . $dayConfig['day_name'], [
                    'user_id' => $user->id,
                    'date' => $dateKey,
                    'existing' => $existingCountForDay,
                    'target' => $targetCount
                ]);
                continue;
            }

            // ✅ Générer les posts manquants pour ce jour
            $existingPlatforms = $existingByDate->get($dateKey, collect())->pluck('platform')->toArray();
            $postIndex = 0;

            foreach ($dayConfig['platforms'] as $platform) {
                try {
                    // ✅ SÉCURITÉ : Vérifier que la plateforme est toujours dans enabled_platforms
                    if (!in_array($platform, $enabledPlatforms)) {
                        Log::warning("🚫 [WEEKLY-SOCIAL] Plateforme non autorisée - ignorée", [
                            'user_id' => $user->id,
                            'platform' => $platform,
                            'enabled_platforms' => $enabledPlatforms
                        ]);
                        continue;
                    }

                    // ✅ ANTI-DOUBLONS STRICT : Vérifier par date + plateforme
                    $duplicateCheck = SocialMediaPost::where('user_id', $user->id)
                        ->where('platform', $platform)
                        ->where('is_ai_generated', true)
                        ->whereDate('published_at', $dateKey)
                        ->exists();

                    if ($duplicateCheck) {
                        Log::warning("🚫 [WEEKLY-SOCIAL] Doublon détecté - ignoré", [
                            'user_id' => $user->id,
                            'date' => $dateKey,
                            'platform' => $platform,
                            'check' => 'date + plateforme'
                        ]);
                        continue;
                    }

                    // ✅ Vérifier si cette plateforme existe déjà pour ce jour (fallback)
                    if (in_array($platform, $existingPlatforms)) {
                        Log::info("⏭️ [WEEKLY-SOCIAL] Plateforme déjà générée", [
                            'user_id' => $user->id,
                            'date' => $dateKey,
                            'platform' => $platform
                        ]);
                        continue;
                    }

                    // ✅ CORRECTION: Tous les posts publiés à 06:00 (indépendant de l'heure de génération)
                    $postDateTime = $postDate->copy()->setTime(6, 0, 0);

                    $isToday = $postDateTime->isToday();
                    $status = $isToday ? 'published' : 'scheduled';

                    $dayInfo = [
                        'date' => $postDateTime,
                        'day_name' => $dayConfig['day_name'],
                        'is_today' => $isToday,
                        'status' => $status
                    ];

                    Log::info("📱 [WEEKLY-SOCIAL] Génération " . $dayConfig['day_name'] . " - " . $platform, [
                        'user_id' => $user->id,
                        'post_date' => $postDateTime->format('Y-m-d H:i:s'),
                        'platform' => $platform,
                        'status' => $status,
                        'access_id' => $accessId
                    ]);

                    $socialResult = $this->generateSingleSocialPost($user, $platform, $dayInfo, $accessId, $proSiteId);

                    if ($socialResult['success'] && isset($socialResult['data'])) {
                        $socialPosts[] = $socialResult['data'];
                        Log::info("✅ [WEEKLY-SOCIAL] Post créé : " . $dayConfig['day_name'] . " - " . $platform, [
                            'user_id' => $user->id,
                            'post_id' => $socialResult['data']->id,
                            'date' => $dateKey
                        ]);
                    } else {
                        Log::error("❌ [WEEKLY-SOCIAL] Échec " . $dayConfig['day_name'] . " - " . $platform, [
                            'user_id' => $user->id,
                            'error' => $socialResult['error'] ?? 'Erreur inconnue'
                        ]);
                    }

                    $postIndex++;
                    usleep(500000); // 0.5 seconde entre chaque post

                } catch (\Exception $e) {
                    Log::error("💥 [WEEKLY-SOCIAL] Exception " . $dayConfig['day_name'] . " - " . $platform, [
                        'user_id' => $user->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        Log::info("✅ [WEEKLY-SOCIAL] Génération terminée", [
            'user_id' => $user->id,
            'posts_generated' => count($socialPosts),
            'week' => $baseTime->format('Y-W')
        ]);

        return $socialPosts;
    }

    /**
     * ✅ NOUVEAU : Supprimer les émojis pour éviter les erreurs UTF-8
     */
    private function removeEmojis(string $text): string
    {
        // Supprimer tous les émojis (caractères Unicode > U+1F000)
        return preg_replace('/[\x{1F000}-\x{1F9FF}]/u', '', $text) ?? $text;
    }
}
