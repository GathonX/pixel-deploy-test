<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Services\ContentGeneration\ContentGenerationService;
use App\Services\ContentGeneration\SocialMediaGenerationRulesService;
use Illuminate\Support\Facades\Log;

class FixDuplicateContentCommand extends Command
{
    /**
     * ✅ COMMANDE : Corriger le contenu dupliqué des posts
     */
    protected $signature = 'posts:fix-duplicates
                            {--user= : ID utilisateur spécifique}
                            {--type= : Type de posts (blog|social|all)}
                            {--dry-run : Simulation sans modifications réelles}
                            {--regenerate : Régénérer le contenu dupliqué}
                            {--delete-unsolvable : Supprimer les posts impossibles à régénérer}';

    protected $description = 'Analyser et corriger le contenu dupliqué des blog posts et social media posts';

    public function handle()
    {
        $this->info("🔍 Analyse et correction du contenu dupliqué");
        $this->line("═══════════════════════════════════════════════");

        $startTime = now();
        $stats = [
            'blog_duplicates_found' => 0,
            'social_duplicates_found' => 0,
            'total_processed' => 0
        ];

        try {
            $isDryRun = $this->option('dry-run');
            $userFilter = $this->option('user');
            $typeFilter = $this->option('type') ?? 'all';

            if ($isDryRun) {
                $this->warn("🔍 MODE SIMULATION - Analyse seulement");
            }

            // Analyser blog posts
            if ($typeFilter === 'all' || $typeFilter === 'blog') {
                $blogStats = $this->analyzeBlogDuplicates($userFilter);
                $stats['blog_duplicates_found'] = $blogStats['duplicates_found'];
                $stats['total_processed'] += $blogStats['total_processed'];
            }

            // Analyser social posts
            if ($typeFilter === 'all' || $typeFilter === 'social') {
                $socialStats = $this->analyzeSocialDuplicates($userFilter);
                $stats['social_duplicates_found'] = $socialStats['duplicates_found'];
                $stats['total_processed'] += $socialStats['total_processed'];
            }

            // Afficher résultats
            $duration = $startTime->diffInSeconds(now());
            $this->displayResults($stats, $duration);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ ERREUR: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    /**
     * ✅ Analyser doublons blog posts
     */
    private function analyzeBlogDuplicates(?int $userFilter): array
    {
        $query = BlogPost::where('is_ai_generated', true);
        
        if ($userFilter) {
            $query->where('user_id', $userFilter);
        }

        $posts = $query->get();
        
        $stats = ['duplicates_found' => 0, 'total_processed' => $posts->count()];

        $this->info("📝 Analyse de {$posts->count()} blog posts...");

        // Grouper par titre similaire
        $titleGroups = [];
        foreach ($posts as $post) {
            $titleKey = $this->normalizeTitle($post->title);
            $titleGroups[$titleKey][] = $post;
        }

        foreach ($titleGroups as $titleKey => $duplicates) {
            if (count($duplicates) > 1) {
                $stats['duplicates_found']++;
                
                $this->warn("❌ Titre dupliqué: " . substr($titleKey, 0, 50) . "... (" . count($duplicates) . " posts)");
                
                foreach ($duplicates as $duplicate) {
                    $this->line("   - ID {$duplicate->id}: {$duplicate->created_at}");
                }

                // ✅ NOUVEAU : Régénération automatique si demandée
                if ($this->option('regenerate')) {
                    $this->regenerateBlogDuplicates($duplicates);
                }
            }
        }

        return $stats;
    }

    /**
     * ✅ Analyser doublons social media posts
     */
    private function analyzeSocialDuplicates(?int $userFilter): array
    {
        $query = SocialMediaPost::where('is_ai_generated', true);
        
        if ($userFilter) {
            $query->where('user_id', $userFilter);
        }

        $posts = $query->get();
        
        $stats = ['duplicates_found' => 0, 'total_processed' => $posts->count()];

        $this->info("📱 Analyse de {$posts->count()} social media posts...");

        // Grouper par contenu similaire
        $contentGroups = [];
        foreach ($posts as $post) {
            $contentKey = $this->normalizeContent($post->content);
            $contentGroups[$contentKey][] = $post;
        }

        foreach ($contentGroups as $contentKey => $duplicates) {
            if (count($duplicates) > 1) {
                $stats['duplicates_found']++;
                
                $this->warn("❌ Contenu dupliqué: " . substr($contentKey, 0, 40) . "... (" . count($duplicates) . " posts)");
                
                foreach ($duplicates as $duplicate) {
                    $this->line("   - ID {$duplicate->id} ({$duplicate->platform}): {$duplicate->created_at}");
                }

                // ✅ NOUVEAU : Régénération automatique si demandée
                if ($this->option('regenerate')) {
                    $this->regenerateSocialDuplicates($duplicates);
                }
            }
        }

        return $stats;
    }

    /**
     * ✅ Normaliser titre pour détecter doublons
     */
    private function normalizeTitle(string $title): string
    {
        // Nettoyer et normaliser le titre
        $normalized = strtolower(trim($title));
        $normalized = preg_replace('/[^\w\s]/', '', $normalized); // Supprimer ponctuation
        $normalized = preg_replace('/\s+/', ' ', $normalized); // Normaliser espaces
        
        // Garder les 30 premiers caractères significatifs
        return substr($normalized, 0, 30);
    }

    /**
     * ✅ Normaliser contenu pour détecter doublons
     */
    private function normalizeContent(string $content): string
    {
        // Nettoyer et normaliser le contenu
        $normalized = strtolower(trim($content));
        $normalized = preg_replace('/[^\w\s]/', '', $normalized);
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        
        // Garder les 50 premiers caractères significatifs
        return substr($normalized, 0, 50);
    }

    /**
     * ✅ Afficher résultats
     */
    private function displayResults(array $stats, int $duration): void
    {
        $this->line("═══════════════════════════════════════════════");
        $this->info("🏁 ANALYSE CONTENU DUPLIQUÉ TERMINÉE");

        $this->table([
            'Métrique', 'Valeur'
        ], [
            ['📝 Groupes doublons blog', $stats['blog_duplicates_found']],
            ['📱 Groupes doublons social', $stats['social_duplicates_found']],
            ['📊 Total posts analysés', $stats['total_processed']],
            ['⏱️ Durée', "{$duration}s"],
        ]);

        $totalDuplicates = $stats['blog_duplicates_found'] + $stats['social_duplicates_found'];

        if ($totalDuplicates > 0) {
            $this->error("⚠️ {$totalDuplicates} groupes de contenu dupliqué détectés!");
            $this->info("💡 Ces doublons nécessitent une correction manuelle ou automatique");
        } else {
            $this->info("✅ Aucun contenu dupliqué détecté");
        }
    }

    /**
     * ✅ NOUVEAU : Régénérer blog posts dupliqués
     */
    private function regenerateBlogDuplicates(array $duplicates): void
    {
        try {
            $isDryRun = $this->option('dry-run');
            $contentService = app(ContentGenerationService::class);
            
            // Garder le plus ancien, régénérer les autres
            $oldest = collect($duplicates)->sortBy('created_at')->first();
            $toRegenerate = collect($duplicates)->filter(fn($post) => $post->id !== $oldest->id);
            
            $this->info("   🔄 Garder le plus ancien (ID {$oldest->id}), régénérer " . $toRegenerate->count() . " posts");
            
            foreach ($toRegenerate as $post) {
                if ($isDryRun) {
                    $this->line("   🔄 [SIMULATION] Régénérerait blog post ID {$post->id}");
                    continue;
                }

                $this->line("   🔄 Régénération blog post ID {$post->id}...");
                
                $attempts = 0;
                $maxAttempts = 3;
                
                do {
                    $attempts++;
                    $this->line("   🎲 Tentative $attempts/$maxAttempts...");
                    
                    // Générer nouveau contenu avec plus de variation
                    $uniqueVariation = uniqid() . '_' . $attempts;
                    $result = $contentService->generateBlogContent(
                        $post->user, 
                        [
                            'topic_category' => $post->topic_category ?? 'général',
                            'variation_seed' => $uniqueVariation,
                            'avoid_similar_title' => true,
                            'creativity_level' => 'high'
                        ]
                    );
                    
                    if ($result['success']) {
                        $newTitle = $result['data']['title'];
                        $normalizedNewTitle = $this->normalizeTitle($newTitle);
                        
                        // Vérifier que le nouveau titre n'est pas similaire aux existants
                        $existingTitles = BlogPost::where('user_id', $post->user_id)
                            ->where('id', '!=', $post->id)
                            ->where('is_ai_generated', true)
                            ->pluck('title')
                            ->map(fn($title) => $this->normalizeTitle($title))
                            ->toArray();
                        
                        if (!in_array($normalizedNewTitle, $existingTitles)) {
                            // Titre unique trouvé !
                            $post->update([
                                'title' => $result['data']['title'],
                                'content' => $result['data']['content'],
                                'excerpt' => $result['data']['excerpt'] ?? null,
                                'featured_image_url' => $result['data']['featured_image_url'] ?? null,
                                'updated_at' => now()
                            ]);
                            
                            $this->info("   ✅ Blog post ID {$post->id} régénéré avec succès (tentative $attempts)");
                            break;
                        } else {
                            $this->warn("   ⚠️ Titre similaire détecté, nouvelle tentative...");
                        }
                    } else {
                        $this->warn("   ⚠️ Échec génération, nouvelle tentative...");
                    }
                    
                    // Délai entre tentatives
                    if ($attempts < $maxAttempts) {
                        sleep(2);
                    }
                    
                } while ($attempts < $maxAttempts);
                
                if ($attempts >= $maxAttempts) {
                    $this->error("   ❌ Impossible de générer un titre unique pour le post ID {$post->id} après $maxAttempts tentatives");
                    
                    // ✅ NOUVEAU : Option de suppression si irrrécupérable
                    if ($this->option('delete-unsolvable')) {
                        $this->warn("   🗑️ Suppression du post ID {$post->id} (irrécupérable)...");
                        $post->delete();
                        $this->info("   ✅ Post ID {$post->id} supprimé avec succès");
                    } else {
                        $this->info("   💡 Utilisez --delete-unsolvable pour supprimer ce post");
                    }
                }
                
                // Délai pour éviter la surcharge API
                sleep(1);
            }
            
        } catch (\Exception $e) {
            $this->error("   💥 Erreur régénération blog posts: " . $e->getMessage());
        }
    }

    /**
     * ✅ NOUVEAU : Régénérer social media posts dupliqués
     */
    private function regenerateSocialDuplicates(array $duplicates): void
    {
        try {
            $isDryRun = $this->option('dry-run');
            $contentService = app(ContentGenerationService::class);
            
            // Garder le plus ancien, régénérer les autres
            $oldest = collect($duplicates)->sortBy('created_at')->first();
            $toRegenerate = collect($duplicates)->filter(fn($post) => $post->id !== $oldest->id);
            
            $this->info("   🔄 Garder le plus ancien (ID {$oldest->id}), régénérer " . $toRegenerate->count() . " posts");
            
            foreach ($toRegenerate as $post) {
                if ($isDryRun) {
                    $this->line("   🔄 [SIMULATION] Régénérerait social post ID {$post->id} ({$post->platform})");
                    continue;
                }

                $this->line("   🔄 Régénération social post ID {$post->id} ({$post->platform})...");
                
                // Générer nouveau contenu
                $result = $contentService->generateSocialContent(
                    $post->user,
                    $post->platform,
                    ['topic_category' => $post->topic_category ?? 'général']
                );
                
                if ($result['success']) {
                    $post->update([
                        'content' => $result['data']['content'],
                        'hashtags' => $result['data']['hashtags'] ?? null,
                        'media_url' => $result['data']['media_url'] ?? null,
                        'updated_at' => now()
                    ]);
                    
                    $this->info("   ✅ Social post ID {$post->id} régénéré avec succès");
                } else {
                    $this->error("   ❌ Échec régénération social post ID {$post->id}: " . ($result['error'] ?? 'Erreur inconnue'));
                }
                
                // Délai pour éviter la surcharge API
                sleep(1);
            }
            
        } catch (\Exception $e) {
            $this->error("   💥 Erreur régénération social posts: " . $e->getMessage());
        }
    }
}
