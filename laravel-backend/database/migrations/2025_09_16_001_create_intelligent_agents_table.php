<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('intelligent_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Configuration de base de l'agent
            $table->string('name', 100)->default('Agent IA');
            $table->enum('tier', ['free', 'premium', 'enterprise'])->default('free');
            $table->enum('status', ['inactive', 'active', 'paused', 'learning'])->default('inactive');

            // Capacités et limitations
            $table->json('capabilities')->nullable(); // Stockage des capacités selon le tier
            $table->integer('daily_quota_limit')->default(100); // Limite quotidienne (augmentée pour tests)
            $table->integer('daily_quota_used')->default(0); // Consommation quotidienne
            $table->date('quota_reset_date')->default(now()->toDateString()); // Reset quotas

            // Paramètres d'apprentissage
            $table->json('learning_preferences')->nullable(); // Préférences d'apprentissage
            $table->decimal('confidence_threshold', 3, 2)->default(0.75); // Seuil de confiance
            $table->boolean('auto_learning_enabled')->default(true);

            // Paramètres de proactivité
            $table->boolean('proactive_suggestions')->default(false); // FREE: false, PREMIUM: true
            $table->json('proactive_schedule')->nullable(); // Planification des actions proactives
            $table->integer('max_proactive_actions_daily')->default(3);

            // Paramètres de réactivité
            $table->json('event_subscriptions')->nullable(); // Events auxquels l'agent réagit
            $table->boolean('realtime_monitoring')->default(false); // Premium only
            $table->integer('reaction_delay_seconds')->default(300); // Délai de réaction (FREE: plus élevé)

            // Communication et social
            $table->boolean('multi_agent_communication')->default(false); // Premium only
            $table->json('agent_network_preferences')->nullable(); // Préférences réseau d'agents

            // Métriques et performance
            $table->integer('total_interactions')->default(0);
            $table->integer('successful_recommendations')->default(0);
            $table->decimal('average_satisfaction_score', 3, 2)->default(0.0);
            $table->timestamp('last_active_at')->nullable();
            $table->timestamp('last_learning_update')->nullable();

            // Personnalisation
            $table->string('avatar_style', 50)->default('professional');
            $table->string('communication_tone', 50)->default('friendly');
            $table->json('user_preferences')->nullable(); // Préférences utilisateur spécifiques

            $table->timestamps();

            // Index pour les performances
            $table->index(['user_id', 'status']);
            $table->index(['tier', 'status']);
            $table->index('quota_reset_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('intelligent_agents');
    }
};