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
        Schema::create('user_agent_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('intelligent_agent_id')->nullable()->constrained()->onDelete('cascade');

            // Préférences de communication
            $table->enum('preferred_communication_style', ['formal', 'casual', 'professional', 'friendly'])->default('professional');
            $table->enum('response_length', ['concise', 'detailed', 'adaptive'])->default('adaptive');
            $table->string('preferred_language', 10)->default('fr');

            // Préférences de notifications
            $table->boolean('email_notifications')->default(true);
            $table->boolean('push_notifications')->default(true);
            $table->boolean('sms_notifications')->default(false);
            $table->json('notification_schedule')->nullable(); // Heures préférées pour notifications

            // Préférences d'analyse
            $table->json('business_focus_areas')->nullable(); // Domaines business prioritaires
            $table->boolean('include_competitor_analysis')->default(false); // Premium feature
            $table->boolean('include_market_trends')->default(false); // Premium feature
            $table->boolean('deep_financial_analysis')->default(false); // Premium feature

            // Préférences de proactivité
            $table->boolean('allow_proactive_suggestions')->default(false);
            $table->integer('max_suggestions_per_day')->default(3);
            $table->json('proactive_topics')->nullable(); // Sujets pour suggestions proactives

            // Préférences d'apprentissage
            $table->boolean('allow_learning_from_interactions')->default(true);
            $table->boolean('share_anonymized_data')->default(false); // Pour améliorer l'IA globale
            $table->boolean('personalized_recommendations')->default(true);

            // Limites et restrictions
            $table->integer('daily_interaction_limit')->nullable(); // Override des limites par défaut
            $table->json('restricted_topics')->nullable(); // Sujets à éviter
            $table->json('preferred_business_categories')->nullable(); // Catégories préférées

            // Historique des préférences
            $table->timestamp('preferences_last_updated')->default(now());
            $table->json('previous_preferences')->nullable(); // Backup des anciennes préférences

            $table->timestamps();

            // Contraintes uniques
            $table->unique('user_id'); // Un utilisateur = une configuration

            // Index pour les performances
            $table->index('user_id');
            $table->index('preferred_communication_style');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_agent_preferences');
    }
};