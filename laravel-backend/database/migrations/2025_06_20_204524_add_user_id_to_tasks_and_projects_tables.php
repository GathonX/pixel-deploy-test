<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ✅ CORRECTION 5 : Ajouter user_id aux tables tasks et projects
     */
    public function up(): void
    {
        // ===== AJOUTER USER_ID À LA TABLE TASKS =====
        
        if (Schema::hasTable('tasks') && !Schema::hasColumn('tasks', 'user_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->foreignId('user_id')
                      ->nullable()
                      ->after('id')
                      ->constrained('users')
                      ->nullOnDelete()
                      ->comment('Propriétaire de la tâche');
                      
                $table->index(['user_id'], 'idx_tasks_user_id');
            });
            
            echo "✅ Colonne user_id ajoutée à la table tasks\n";
        } else {
            echo "ℹ️  Table tasks déjà configurée ou inexistante\n";
        }

        // ===== AJOUTER USER_ID À LA TABLE PROJECTS =====
        
        if (Schema::hasTable('projects') && !Schema::hasColumn('projects', 'user_id')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->foreignId('user_id')
                      ->nullable()
                      ->after('id')
                      ->constrained('users')
                      ->nullOnDelete()
                      ->comment('Propriétaire du projet');
                      
                $table->index(['user_id'], 'idx_projects_user_id');
            });
            
            echo "✅ Colonne user_id ajoutée à la table projects\n";
        } else {
            echo "ℹ️  Table projects déjà configurée ou inexistante\n";
        }

        echo "🎉 Migration terminée avec succès!\n";
    }

    /**
     * Annuler les modifications
     */
    public function down(): void
    {
        // Retirer user_id de tasks
        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'user_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropIndex('idx_tasks_user_id');
                $table->dropColumn('user_id');
            });
        }

        // Retirer user_id de projects
        if (Schema::hasTable('projects') && Schema::hasColumn('projects', 'user_id')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropIndex('idx_projects_user_id');
                $table->dropColumn('user_id');
            });
        }

        echo "❌ Colonnes user_id supprimées\n";
    }
};