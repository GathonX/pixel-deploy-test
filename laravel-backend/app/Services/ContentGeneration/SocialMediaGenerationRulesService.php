<?php

namespace App\Services\ContentGeneration;

use App\Models\User;
use App\Models\SocialMediaPost;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SocialMediaGenerationRulesService
{
    /**
     * ✅ RÈGLES EXACTES SELON SPECIFICATIONS UTILISATEUR
     *
     * Règles par jour de la semaine (jour d'activation) :
     * - Dimanche : 1 post (facebook seulement)
     * - Lundi : 7 posts (facebook, instagram, twitter, linkedin , facebook, instagram, twitter);

     * - Mardi : 6 posts (facebook, instagram, twitter, linkedin , facebook, instagram);

     * - Mercredi : 5 posts (facebook, instagram, twitter, linkedin , facebook)
     * - Jeudi : 4 posts (facebook, instagram, twitter, linkedin)
     * - Vendredi : 3 posts (facebook, instagram, twitter)
     * - Samedi : 2 posts (facebook, instagram)
     * - Chaque tout les lundi c'est la régeneration automatique de 7 post pour chaque users
     */

    private array $platformsByDay = [
        0 => ['facebook'], // Dimanche : 1 post
        1 => ['facebook', 'instagram', 'twitter', 'linkedin', 'facebook', 'instagram', 'twitter'], // Lundi : 7 posts
        2 => ['facebook', 'instagram', 'twitter', 'linkedin', 'facebook', 'instagram'], // Mardi : 6 posts
        3 => ['facebook', 'instagram', 'twitter', 'linkedin', 'facebook'], // Mercredi : 5 posts
        4 => ['facebook', 'instagram', 'twitter', 'linkedin'], // Jeudi : 4 posts
        5 => ['facebook', 'instagram', 'twitter'], // Vendredi : 3 posts
        6 => ['facebook', 'instagram'], // Samedi : 2 posts
    ];

    /**
     * ✅ CALCULER LE NOMBRE DE POSTS SOCIAUX SELON LE JOUR D'ACTIVATION
     */
    public function calculateSocialPostsCount(Carbon $activationDate): int
    {
        $dayOfWeek = $activationDate->dayOfWeek; // 0=dimanche, 1=lundi...

        $totalPosts = count($this->platformsByDay[$dayOfWeek]);

        Log::info("📊 [SOCIAL RULES] Calcul posts sociaux", [
            'activation_date' => $activationDate->format('Y-m-d (l)'),
            'day_of_week' => $dayOfWeek,
            'platforms' => $this->platformsByDay[$dayOfWeek],
            'total_posts' => $totalPosts
        ]);

        return $totalPosts;
    }

    /**
     * ✅ OBTENIR LA LISTE DES PLATEFORMES SELON LES RÈGLES
     */
    public function getPlatformsForActivationDay(Carbon $activationDate): array
    {
        $dayOfWeek = $activationDate->dayOfWeek;

        // Plateformes spécifiques selon les règles exactes
        $platforms = $this->platformsByDay[$dayOfWeek];

        Log::info("🎯 [SOCIAL RULES] Plateformes calculées", [
            'activation_date' => $activationDate->format('Y-m-d (l)'),
            'day_of_week' => $dayOfWeek,
            'platforms' => $platforms,
            'total_count' => count($platforms)
        ]);

        return $platforms;
    }

    /**
     * ✅ VÉRIFIER SI NOUS AVONS LE BON NOMBRE DE POSTS POUR UN UTILISATEUR
     */
    public function validateUserSocialPosts(User $user): array
    {
        try {
            // Obtenir la date d'activation
            $activationDate = $this->getActivationDate($user);
            if (!$activationDate) {
                return [
                    'valid' => false,
                    'error' => 'Date d\'activation non trouvée'
                ];
            }

            // Calculer le nombre attendu
            $expectedCount = $this->calculateSocialPostsCount($activationDate);

            // Obtenir les plateformes attendues
            $expectedPlatforms = $this->getPlatformsForActivationDay($activationDate);

            // Compter les posts existants de cette semaine
            $startOfWeek = $activationDate->copy()->startOfWeek();
            $endOfWeek = $activationDate->copy()->endOfWeek();

            $existingPosts = SocialMediaPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->get();

            $actualCount = $existingPosts->count();
            $actualPlatforms = $existingPosts->pluck('platform')->unique()->values()->toArray();

            $validation = [
                'valid' => $actualCount === $expectedCount,
                'activation_date' => $activationDate->format('Y-m-d (l)'),
                'expected_count' => $expectedCount,
                'actual_count' => $actualCount,
                'expected_platforms' => $expectedPlatforms,
                'actual_platforms' => $actualPlatforms,
                'missing_count' => max(0, $expectedCount - $actualCount),
                'excess_count' => max(0, $actualCount - $expectedCount),
                'posts_details' => $existingPosts->map(function ($post) {
                    return [
                        'id' => $post->id,
                        'platform' => $post->platform,
                        'created_at' => $post->created_at->format('Y-m-d H:i:s'),
                        'status' => $post->status
                    ];
                })->toArray()
            ];

            Log::info("✅ [SOCIAL RULES] Validation posts utilisateur", [
                'user_id' => $user->id,
                'validation' => $validation
            ]);

            return $validation;

        } catch (\Exception $e) {
            Log::error("❌ [SOCIAL RULES] Erreur validation", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return [
                'valid' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * ✅ OBTENIR LA PROCHAINE PLATEFORME À GÉNÉRER
     */
    public function getNextPlatformToGenerate(User $user): ?string
    {
        try {
            $validation = $this->validateUserSocialPosts($user);

            if ($validation['valid']) {
                // Tous les posts sont générés
                Log::info("✅ [SOCIAL RULES] Tous les posts générés", [
                    'user_id' => $user->id,
                    'count' => $validation['actual_count']
                ]);
                return null;
            }

            if ($validation['missing_count'] <= 0) {
                // Pas de posts manquants
                return null;
            }

            // Obtenir les plateformes attendues vs actuelles
            $expectedPlatforms = $validation['expected_platforms'];
            $actualPlatforms = $validation['actual_platforms'];

            // Trouver une plateforme manquante ou en déficit
            foreach (array_count_values($expectedPlatforms) as $platform => $expectedCount) {
                $actualCount = array_count_values($actualPlatforms)[$platform] ?? 0;

                if ($actualCount < $expectedCount) {
                    Log::info("🎯 [SOCIAL RULES] Plateforme suivante trouvée", [
                        'user_id' => $user->id,
                        'platform' => $platform,
                        'expected_count' => $expectedCount,
                        'actual_count' => $actualCount
                    ]);

                    return $platform;
                }
            }

            // Fallback : prendre la première plateforme de la liste attendue
            $nextPlatform = $expectedPlatforms[0] ?? null;

            Log::info("🔄 [SOCIAL RULES] Fallback plateforme", [
                'user_id' => $user->id,
                'platform' => $nextPlatform
            ]);

            return $nextPlatform;

        } catch (\Exception $e) {
            Log::error("❌ [SOCIAL RULES] Erreur obtention prochaine plateforme", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return 'facebook'; // Fallback sur Facebook
        }
    }

    /**
     * ✅ OBTENIR LA DATE D'ACTIVATION SOCIAL MEDIA
     */
    private function getActivationDate(User $user): ?Carbon
    {
        $access = $user->featureAccess()
            ->whereHas('feature', function($query) {
                $query->where('key', 'social_media');
            })
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->first();

        if (!$access || !$access->user_activated_at) {
            return null;
        }

        return Carbon::parse($access->user_activated_at);
    }

    /**
     * ✅ CORRIGER LES POSTS EXISTANTS SELON LES RÈGLES
     */
    public function fixUserSocialPosts(User $user, bool $dryRun = false): array
    {
        try {
            $validation = $this->validateUserSocialPosts($user);

            if (!$validation || $validation['valid']) {
                return [
                    'success' => true,
                    'message' => 'Posts déjà conformes aux règles',
                    'actions' => []
                ];
            }

            $actions = [];

            // Si trop de posts, marquer les surplus
            if ($validation['excess_count'] > 0) {
                $excessPosts = SocialMediaPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->orderBy('created_at', 'desc')
                    ->limit($validation['excess_count'])
                    ->get();

                foreach ($excessPosts as $post) {
                    if (!$dryRun) {
                        $post->update(['status' => 'draft']);
                    }

                    $actions[] = "Post {$post->id} ({$post->platform}) marqué comme draft (surplus)";
                }
            }

            return [
                'success' => true,
                'message' => 'Posts corrigés selon les règles',
                'actions' => $actions,
                'validation' => $validation
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Obtenir la prochaine plateforme pour l'activation selon l'ordre
     */
    public function getNextPlatformForActivation(User $user, int $postNumber): ?string
    {
        try {
            $today = Carbon::now();
            $dayOfWeek = $today->dayOfWeek; // 0=dimanche, 1=lundi...
            
            $platformsSequence = $this->platformsByDay[$dayOfWeek];
            
            // Vérifier si le numéro de post est valide (commence à 1)
            if ($postNumber < 1 || $postNumber > count($platformsSequence)) {
                Log::warning("⚠️ [SOCIAL RULES] Numéro de post invalide pour activation", [
                    'user_id' => $user->id,
                    'post_number' => $postNumber,
                    'max_posts' => count($platformsSequence),
                    'day' => $today->format('l')
                ]);
                return null;
            }
            
            // Index tableau commence à 0, donc -1
            $platform = $platformsSequence[$postNumber - 1];
            
            Log::info("📱 [SOCIAL RULES] Plateforme sélectionnée pour activation", [
                'user_id' => $user->id,
                'post_number' => $postNumber,
                'platform' => $platform,
                'day' => $today->format('l'),
                'total_platforms' => count($platformsSequence)
            ]);
            
            return $platform;
            
        } catch (\Exception $e) {
            Log::error("💥 [SOCIAL RULES] Erreur sélection plateforme activation", [
                'user_id' => $user->id,
                'post_number' => $postNumber,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }
}
