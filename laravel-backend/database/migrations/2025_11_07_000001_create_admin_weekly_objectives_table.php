<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ✅ MIGRATION : Créer table pour stocker les objectifs hebdomadaires admin
     * Générés automatiquement par l'IA à partir des idées admin
     */
    public function up(): void
    {
        Schema::create('admin_weekly_objectives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_project_info_id')->constrained('admin_project_info')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // L'admin

            // Identifiant de semaine
            $table->string('week_identifier'); // Format: Y-W (ex: 2025-45)
            $table->date('week_start_date');
            $table->date('week_end_date');

            // Objectif généré par IA
            $table->text('objective_text'); // Objectif principal de la semaine
            $table->json('daily_topics')->nullable(); // Sujets quotidiens suggérés (7 jours)
            $table->json('keywords_focus')->nullable(); // Mots-clés à utiliser cette semaine

            // Métadonnées génération
            $table->boolean('is_generated')->default(true); // Généré par IA
            $table->integer('posts_generated_count')->default(0); // Nombre de posts générés
            $table->integer('posts_target_count')->default(7); // Objectif de posts

            $table->timestamps();

            // Index (noms raccourcis pour MySQL)
            $table->index(['admin_project_info_id', 'week_identifier'], 'awo_project_week_idx');
            $table->index('user_id', 'awo_user_idx');
            $table->index('week_identifier', 'awo_week_idx');
            $table->unique(['admin_project_info_id', 'week_identifier'], 'awo_project_week_unique'); // 1 seul objectif par semaine
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_weekly_objectives');
    }
};
