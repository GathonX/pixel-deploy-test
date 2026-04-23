<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * 🛡️ CORRECTION : Empêcher plusieurs posts avec la même date de publication pour un même utilisateur
     *
     * Problème identifié : Tous les posts générés avaient la même date "03 déc. 2025"
     * Solution : Contrainte unique sur (user_id, DATE(published_at)) pour garantir 1 seul post par jour par utilisateur
     */
    public function up(): void
    {
        // ✅ ÉTAPE 1 : Nettoyer les doublons existants avant d'ajouter la contrainte
        DB::statement("
            DELETE bp1 FROM blog_posts bp1
            INNER JOIN blog_posts bp2
            WHERE bp1.id > bp2.id
            AND bp1.user_id = bp2.id
            AND DATE(bp1.published_at) = DATE(bp2.published_at)
            AND bp1.is_ai_generated = 1
        ");

        // ✅ ÉTAPE 2 : Créer un index unique sur (user_id, published_at_date)
        // Note: MySQL ne supporte pas les index sur expressions calculées directement
        // On va donc créer une colonne virtuelle pour la date extraite
        Schema::table('blog_posts', function (Blueprint $table) {
            // Vérifier si la colonne existe avant de la créer
            if (!Schema::hasColumn('blog_posts', 'published_date')) {
                DB::statement('ALTER TABLE blog_posts ADD COLUMN published_date DATE AS (DATE(published_at)) STORED');
            }

            // Créer un index unique sur (user_id, published_date) si non existant
            // Vérifier d'abord si l'index existe
            $indexExists = DB::select("
                SELECT COUNT(*) as count
                FROM information_schema.STATISTICS
                WHERE table_schema = DATABASE()
                AND table_name = 'blog_posts'
                AND index_name = 'unique_user_published_date'
            ");

            if ($indexExists[0]->count == 0) {
                $table->unique(['user_id', 'published_date'], 'unique_user_published_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            // Supprimer l'index unique
            $table->dropUnique('unique_user_published_date');

            // Supprimer la colonne virtuelle
            $table->dropColumn('published_date');
        });
    }
};
