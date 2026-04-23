<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * ✅ Migration pour lier les posts/sprints à un achat spécifique
     *
     * Objectif : Chaque post/sprint est lié à l'achat (UserFeatureAccess) qui l'a créé
     * Permet de :
     * - Afficher uniquement les posts de l'achat actif
     * - Conserver l'historique des anciens achats
     * - Supprimer facilement les données d'un ancien achat
     */
    public function up(): void
    {
        // 1. Ajouter la colonne à blog_posts si elle n'existe pas
        if (!Schema::hasColumn('blog_posts', 'user_feature_access_id')) {
            Schema::table('blog_posts', function (Blueprint $table) {
                $table->foreignId('user_feature_access_id')
                      ->nullable() // Nullable pour les posts existants
                      ->after('user_id')
                      ->constrained('user_feature_access')
                      ->onDelete('cascade'); // Si l'achat est supprimé, supprimer les posts

                // Index pour performance
                $table->index(['user_id', 'user_feature_access_id']);
            });
        }

        // 2. Ajouter la colonne à social_media_posts si elle n'existe pas
        if (!Schema::hasColumn('social_media_posts', 'user_feature_access_id')) {
            Schema::table('social_media_posts', function (Blueprint $table) {
                $table->foreignId('user_feature_access_id')
                      ->nullable()
                      ->after('user_id')
                      ->constrained('user_feature_access')
                      ->onDelete('cascade');

                $table->index(['user_id', 'user_feature_access_id']);
            });
        }

        // 3. Ajouter la colonne à sprints (si la table existe et colonne n'existe pas)
        if (Schema::hasTable('sprints') && !Schema::hasColumn('sprints', 'user_feature_access_id')) {
            Schema::table('sprints', function (Blueprint $table) {
                $table->foreignId('user_feature_access_id')
                      ->nullable()
                      ->after('user_id')
                      ->constrained('user_feature_access')
                      ->onDelete('cascade');

                $table->index(['user_id', 'user_feature_access_id']);
            });
        }

        // 4. ✅ MIGRATION DES DONNÉES EXISTANTES
        // Attribuer les posts/sprints existants à l'access actif de l'utilisateur
        $this->migrateExistingData();
    }

    /**
     * Migration des données existantes
     */
    private function migrateExistingData(): void
    {
        // Pour chaque utilisateur ayant des posts
        $usersWithBlogPosts = DB::table('blog_posts')
            ->select('user_id')
            ->distinct()
            ->get();

        foreach ($usersWithBlogPosts as $user) {
            // Trouver l'access ACTIF pour la fonctionnalité blog
            $blogAccess = DB::table('user_feature_access as ufa')
                ->join('features as f', 'ufa.feature_id', '=', 'f.id')
                ->where('ufa.user_id', $user->user_id)
                ->where('f.key', 'blog')
                ->where('ufa.status', 'active')
                ->where('ufa.admin_enabled', true)
                ->orderBy('ufa.created_at', 'desc')
                ->first();

            if ($blogAccess) {
                // Attribuer tous les blog posts existants à cet access
                DB::table('blog_posts')
                    ->where('user_id', $user->user_id)
                    ->whereNull('user_feature_access_id')
                    ->update(['user_feature_access_id' => $blogAccess->id]);
            }
        }

        // Même chose pour social media posts
        $usersWithSocialPosts = DB::table('social_media_posts')
            ->select('user_id')
            ->distinct()
            ->get();

        foreach ($usersWithSocialPosts as $user) {
            $socialAccess = DB::table('user_feature_access as ufa')
                ->join('features as f', 'ufa.feature_id', '=', 'f.id')
                ->where('ufa.user_id', $user->user_id)
                ->where('f.key', 'social_media')
                ->where('ufa.status', 'active')
                ->where('ufa.admin_enabled', true)
                ->orderBy('ufa.created_at', 'desc')
                ->first();

            if ($socialAccess) {
                DB::table('social_media_posts')
                    ->where('user_id', $user->user_id)
                    ->whereNull('user_feature_access_id')
                    ->update(['user_feature_access_id' => $socialAccess->id]);
            }
        }

        // Même chose pour sprints si la table existe
        if (Schema::hasTable('sprints')) {
            $usersWithSprints = DB::table('sprints')
                ->select('user_id')
                ->distinct()
                ->get();

            foreach ($usersWithSprints as $user) {
                $sprintAccess = DB::table('user_feature_access as ufa')
                    ->join('features as f', 'ufa.feature_id', '=', 'f.id')
                    ->where('ufa.user_id', $user->user_id)
                    ->where('f.key', 'sprint_planning')
                    ->where('ufa.status', 'active')
                    ->where('ufa.admin_enabled', true)
                    ->orderBy('ufa.created_at', 'desc')
                    ->first();

                if ($sprintAccess) {
                    DB::table('sprints')
                        ->where('user_id', $user->user_id)
                        ->whereNull('user_feature_access_id')
                        ->update(['user_feature_access_id' => $sprintAccess->id]);
                }
            }
        }
    }

    public function down(): void
    {
        // Retirer les colonnes dans l'ordre inverse
        if (Schema::hasTable('sprints')) {
            Schema::table('sprints', function (Blueprint $table) {
                $table->dropForeign(['user_feature_access_id']);
                $table->dropColumn('user_feature_access_id');
            });
        }

        Schema::table('social_media_posts', function (Blueprint $table) {
            $table->dropForeign(['user_feature_access_id']);
            $table->dropColumn('user_feature_access_id');
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropForeign(['user_feature_access_id']);
            $table->dropColumn('user_feature_access_id');
        });
    }
};
