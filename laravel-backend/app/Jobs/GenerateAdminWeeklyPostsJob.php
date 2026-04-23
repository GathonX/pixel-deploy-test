<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ContentGeneration\AdminPostGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class GenerateAdminWeeklyPostsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 600; // 10 minutes max
    public $tries = 1; // 1 seule tentative

    protected $userId;
    protected $skipFirstDay;

    public function __construct(int $userId, bool $skipFirstDay = false)
    {
        $this->userId = $userId;
        $this->skipFirstDay = $skipFirstDay;
    }

    public function handle(AdminPostGenerationService $postService)
    {
        try {
            $user = User::find($this->userId);

            if (!$user) {
                Log::error('❌ [JOB ADMIN POSTS] Utilisateur introuvable', [
                    'user_id' => $this->userId
                ]);
                return;
            }

            Log::info('🚀 [JOB ADMIN POSTS] Démarrage génération asynchrone', [
                'user_id' => $this->userId,
                'job_id' => $this->job->getJobId(),
                'skip_first_day' => $this->skipFirstDay
            ]);

            // Mettre le statut en "processing"
            Cache::put("admin_generation_status_{$this->userId}", [
                'status' => 'processing',
                'progress' => $this->skipFirstDay ? 15 : 0, // Déjà 15% si premier post fait
                'current_step' => $this->skipFirstDay ? 'Génération posts 2-7...' : 'Génération de tous les posts...',
                'message' => 'Génération en cours...',
                'started_at' => now()->toIso8601String()
            ], 600); // 10 minutes

            // Générer les posts (avec ou sans le premier jour)
            $result = $postService->generateWeeklyPostsForAdmin($user, $this->skipFirstDay);

            if ($result['success']) {
                // Succès
                Cache::put("admin_generation_status_{$this->userId}", [
                    'status' => 'completed',
                    'progress' => 100,
                    'message' => "{$result['data']['posts_count']} post(s) généré(s) avec succès",
                    'posts_count' => $result['data']['posts_count'],
                    'objective_id' => $result['data']['objective']->id ?? null,
                    'completed_at' => now()->toIso8601String()
                ], 600);

                Log::info('✅ [JOB ADMIN POSTS] Génération terminée avec succès', [
                    'user_id' => $this->userId,
                    'posts_count' => $result['data']['posts_count']
                ]);
            } else {
                // Échec
                Cache::put("admin_generation_status_{$this->userId}", [
                    'status' => 'failed',
                    'progress' => 0,
                    'message' => $result['error'] ?? 'Erreur lors de la génération',
                    'failed_at' => now()->toIso8601String()
                ], 600);

                Log::error('❌ [JOB ADMIN POSTS] Génération échouée', [
                    'user_id' => $this->userId,
                    'error' => $result['error'] ?? 'Unknown error'
                ]);
            }

        } catch (\Exception $e) {
            Cache::put("admin_generation_status_{$this->userId}", [
                'status' => 'failed',
                'progress' => 0,
                'message' => 'Erreur: ' . $e->getMessage(),
                'failed_at' => now()->toIso8601String()
            ], 600);

            Log::error('💥 [JOB ADMIN POSTS] Exception durant génération', [
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception)
    {
        Cache::put("admin_generation_status_{$this->userId}", [
            'status' => 'failed',
            'progress' => 0,
            'message' => 'Job échoué: ' . $exception->getMessage(),
            'failed_at' => now()->toIso8601String()
        ], 600);

        Log::error('💥 [JOB ADMIN POSTS] Job failed', [
            'user_id' => $this->userId,
            'error' => $exception->getMessage()
        ]);
    }
}
