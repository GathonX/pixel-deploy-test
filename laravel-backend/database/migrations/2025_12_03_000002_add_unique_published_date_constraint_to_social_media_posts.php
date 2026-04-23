<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * 🛡️ CORRECTION : Empêcher plusieurs posts de la même plateforme avec la même date pour un même utilisateur
     *
     * Problème identifié : Possibilité de posts sociaux avec des dates identiques
     * Solution : Contrainte unique sur (user_id, platform, DATE(published_at)) pour garantir l'unicité
     */
    public function up(): void
    {
        // ✅ ÉTAPE 1 : Nettoyer les doublons existants avant d'ajouter la contrainte
        DB::statement("
            DELETE sp1 FROM social_media_posts sp1
            INNER JOIN social_media_posts sp2
            WHERE sp1.id > sp2.id
            AND sp1.user_id = sp2.user_id
            AND sp1.platform = sp2.platform
            AND DATE(sp1.published_at) = DATE(sp2.published_at)
            AND sp1.is_ai_generated = 1
        ");

        // ✅ ÉTAPE 2 : Créer une colonne virtuelle pour la date de publication
        Schema::table('social_media_posts', function (Blueprint $table) {
            // Vérifier si la colonne existe déjà avant de la créer
            if (!Schema::hasColumn('social_media_posts', 'published_date')) {
                DB::statement('ALTER TABLE social_media_posts ADD COLUMN published_date DATE AS (DATE(published_at)) STORED');
            }

            // Vérifier si l'index existe avant de le créer
            $indexExists = DB::select("
                SELECT COUNT(*) as count
                FROM information_schema.STATISTICS
                WHERE table_schema = DATABASE()
                AND table_name = 'social_media_posts'
                AND index_name = 'unique_user_platform_published_date'
            ");

            if ($indexExists[0]->count == 0) {
                // Créer un index unique sur (user_id, platform, published_date)
                $table->unique(['user_id', 'platform', 'published_date'], 'unique_user_platform_published_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('social_media_posts', function (Blueprint $table) {
            // Supprimer l'index unique
            $table->dropUnique('unique_user_platform_published_date');

            // Supprimer la colonne virtuelle si elle existe
            if (Schema::hasColumn('social_media_posts', 'published_date')) {
                $table->dropColumn('published_date');
            }
        });
    }
};
