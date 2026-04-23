<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ✅ MIGRATION : Ajouter lien vers objectif hebdomadaire admin dans blog_posts
     * Permet de tracer quel post a été généré pour quel objectif admin
     */
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            // Lien vers l'objectif hebdomadaire admin (nullable car posts utilisateurs n'en ont pas)
            $table->foreignId('admin_weekly_objective_id')
                ->nullable()
                ->after('user_feature_access_id')
                ->constrained('admin_weekly_objectives')
                ->onDelete('set null');

            // Index pour performance
            $table->index('admin_weekly_objective_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropForeign(['admin_weekly_objective_id']);
            $table->dropColumn('admin_weekly_objective_id');
        });
    }
};
