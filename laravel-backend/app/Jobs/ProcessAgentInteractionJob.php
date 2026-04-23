<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\AgentIntelligent\UniversalAgentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ProcessAgentInteractionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;
    public $tries = 1;

    protected string $interactionId;
    protected int $userId;
    protected string $message;
    protected array $context;

    public function __construct(string $interactionId, int $userId, string $message, array $context = [])
    {
        $this->interactionId = $interactionId;
        $this->userId = $userId;
        $this->message = $message;
        $this->context = $context;
    }

    public function handle(): void
    {
        try {
            Log::info("🚀 Job Agent démarré", [
                'interaction_id' => $this->interactionId,
                'user_id' => $this->userId
            ]);

            $user = User::find($this->userId);
            if (!$user) {
                Cache::put("agent_interaction_{$this->interactionId}", [
                    'status' => 'error',
                    'error' => 'Utilisateur non trouvé'
                ], 600);
                return;
            }

            // Marquer comme en cours
            Cache::put("agent_interaction_{$this->interactionId}", [
                'status' => 'processing',
                'progress' => 0
            ], 600);

            // Traiter avec le service
            $service = new UniversalAgentService($user);
            $response = $service->processInteraction($this->message, $this->context);

            // Sauvegarder le résultat
            Cache::put("agent_interaction_{$this->interactionId}", [
                'status' => 'completed',
                'response' => $response,
                'completed_at' => now()->toISOString()
            ], 600);

            Log::info("✅ Job Agent terminé", [
                'interaction_id' => $this->interactionId,
                'user_id' => $this->userId
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Job Agent échoué", [
                'interaction_id' => $this->interactionId,
                'user_id' => $this->userId,
                'error' => $e->getMessage()
            ]);

            Cache::put("agent_interaction_{$this->interactionId}", [
                'status' => 'error',
                'error' => $e->getMessage()
            ], 600);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("❌ Job Agent failed définitivement", [
            'interaction_id' => $this->interactionId,
            'error' => $exception->getMessage()
        ]);

        Cache::put("agent_interaction_{$this->interactionId}", [
            'status' => 'failed',
            'error' => $exception->getMessage()
        ], 600);
    }
}
