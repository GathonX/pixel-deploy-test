<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 🔧 Étape 1 : Supprimer les foreign keys qui peuvent dépendre de l'index UNIQUE
        DB::statement('ALTER TABLE user_feature_access DROP FOREIGN KEY user_feature_access_feature_id_foreign');
        DB::statement('ALTER TABLE user_feature_access DROP FOREIGN KEY user_feature_access_user_id_foreign');

        // 🎯 Étape 2 : Supprimer l'index UNIQUE
        DB::statement('ALTER TABLE user_feature_access DROP INDEX user_feature_access_user_id_feature_id_unique');

        // 🔧 Étape 3 : Recréer les foreign keys sans dépendre de l'index UNIQUE
        // Laravel créera automatiquement des index simples pour ces foreign keys
        Schema::table('user_feature_access', function (Blueprint $table) {
            $table->foreign('feature_id')->references('id')->on('features')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        // Note : On garde la possibilité d'avoir plusieurs achats pour le même (user_id, feature_id)
        // La validation se fera en PHP : un seul accès actif (expires_at > NOW()) à la fois
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 🔧 Étape 1 : Supprimer les foreign keys recréées
        Schema::table('user_feature_access', function (Blueprint $table) {
            $table->dropForeign(['feature_id']);
            $table->dropForeign(['user_id']);
        });

        // 🎯 Étape 2 : Remettre la contrainte UNIQUE
        DB::statement('ALTER TABLE user_feature_access ADD UNIQUE INDEX user_feature_access_user_id_feature_id_unique (user_id, feature_id)');

        // 🔧 Étape 3 : Recréer les foreign keys originales
        Schema::table('user_feature_access', function (Blueprint $table) {
            $table->foreign('feature_id', 'user_feature_access_feature_id_foreign')->references('id')->on('features')->onDelete('cascade');
            $table->foreign('user_id', 'user_feature_access_user_id_foreign')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
