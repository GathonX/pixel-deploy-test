<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ✅ MIGRATION : Créer table pour stocker les informations/idées projet admin
     * Utilisé pour générer les objectifs hebdomadaires et les posts automatiques admin
     */
    public function up(): void
    {
        Schema::create('admin_project_info', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // L'admin qui a créé

            // Informations business/projet admin
            $table->string('business_name')->nullable(); // Nom du business/projet
            $table->text('business_description')->nullable(); // Description du projet
            $table->json('business_ideas')->nullable(); // Idées principales (array)
            $table->json('target_audience')->nullable(); // Public cible
            $table->json('keywords')->nullable(); // Mots-clés principaux
            $table->string('industry')->nullable(); // Secteur d'activité

            // Objectifs de contenu
            $table->text('content_goals')->nullable(); // Objectifs de contenu
            $table->string('tone_of_voice')->default('professional'); // Ton: professional, casual, friendly, etc.
            $table->json('content_themes')->nullable(); // Thèmes de contenu privilégiés

            // Génération automatique
            $table->boolean('auto_generation_enabled')->default(true); // Activer génération auto
            $table->integer('posts_per_week')->default(7); // Nombre de posts par semaine

            // Métadonnées
            $table->timestamp('last_objective_generated_at')->nullable(); // Dernière génération d'objectif
            $table->string('current_week_identifier')->nullable(); // Semaine courante (Y-W format)

            $table->timestamps();

            // Index pour performance
            $table->index('user_id');
            $table->index('auto_generation_enabled');
            $table->index('current_week_identifier');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_project_info');
    }
};
