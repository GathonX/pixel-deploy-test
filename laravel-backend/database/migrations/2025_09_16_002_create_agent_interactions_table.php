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
        Schema::create('agent_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intelligent_agent_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Type d'interaction
            $table->enum('interaction_type', [
                'question', 'recommendation', 'analysis', 'proactive_suggestion',
                'reactive_alert', 'scheduled_task', 'learning_feedback'
            ]);

            // Contenu de l'interaction
            $table->text('user_input')->nullable(); // Input utilisateur
            $table->text('agent_response')->nullable(); // Réponse de l'agent
            $table->json('context_data')->nullable(); // Contexte/métadonnées

            // Classification et intention
            $table->string('intent', 100)->nullable(); // Intent détectée
            $table->string('category', 50)->nullable(); // business, marketing, finance, etc.
            $table->decimal('confidence_score', 3, 2)->nullable(); // Confiance de l'agent

            // Résultats et feedback
            $table->enum('outcome', ['pending', 'success', 'partial', 'failed'])->default('pending');
            $table->integer('user_satisfaction_rating')->nullable(); // 1-5
            $table->text('user_feedback')->nullable();
            $table->boolean('recommendation_followed')->nullable();

            // Métriques temporelles
            $table->integer('response_time_ms')->nullable(); // Temps de réponse
            $table->timestamp('completed_at')->nullable();

            // Flags pour l'apprentissage
            $table->boolean('used_for_learning')->default(true);
            $table->boolean('marked_as_important')->default(false);

            $table->timestamps();

            // Index pour les performances
            $table->index(['intelligent_agent_id', 'created_at']);
            $table->index(['user_id', 'interaction_type']);
            $table->index(['category', 'outcome']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_interactions');
    }
};