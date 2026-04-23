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
        Schema::create('agent_learning_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intelligent_agent_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Type de données d'apprentissage
            $table->enum('learning_type', [
                'success_pattern', 'failure_pattern', 'user_preference',
                'business_insight', 'market_trend', 'sector_knowledge',
                'automatic_learning', 'pattern_recognition', 'interaction_analysis'
            ]);

            // Contenu de l'apprentissage
            $table->string('pattern_key', 200); // Clé unique du pattern
            $table->json('pattern_data'); // Données du pattern
            $table->text('description')->nullable();

            // Métriques d'efficacité
            $table->integer('success_count')->default(0);
            $table->integer('failure_count')->default(0);
            $table->decimal('effectiveness_score', 3, 2)->default(0.5); // 0.0 - 1.0

            // Contexte et application
            $table->string('business_sector', 100)->nullable();
            $table->string('context_tags', 500)->nullable(); // Tags séparés par virgules
            $table->boolean('global_applicable')->default(false); // Applicable à tous les utilisateurs

            // Validité et évolution
            $table->timestamp('last_validated_at')->nullable();
            $table->timestamp('expires_at')->nullable(); // Expiration pour patterns temporaires
            $table->integer('confidence_level')->default(50); // 0-100

            $table->timestamps();

            // Index pour les performances
            $table->index(['intelligent_agent_id', 'learning_type']);
            $table->index(['pattern_key', 'business_sector']);
            $table->index(['effectiveness_score', 'confidence_level']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_learning_data');
    }
};