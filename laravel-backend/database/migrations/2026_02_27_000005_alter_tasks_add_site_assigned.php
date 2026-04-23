<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Permettre l'assignation à un membre de l'équipe
            $table->foreignId('assigned_to_id')->nullable()->after('sprint_id')
                  ->constrained('users')->nullOnDelete();

            // Rendre description et scheduled_date optionnels pour les tâches créées depuis réservations
            $table->text('description')->nullable()->change();
            $table->date('scheduled_date')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['assigned_to_id']);
            $table->dropColumn('assigned_to_id');
        });
    }
};
