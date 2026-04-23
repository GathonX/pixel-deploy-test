<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // ✅ Colonnes SLA pour le temps de réponse estimé
            $table->string('priority', 10)->default('medium')->after('status'); // low, medium, high
            $table->integer('estimated_response_hours')->nullable()->after('priority'); // Temps estimé en heures
            $table->timestamp('first_response_at')->nullable()->after('estimated_response_hours'); // Première réponse admin
            $table->timestamp('resolved_at')->nullable()->after('first_response_at'); // Date de résolution
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['priority', 'estimated_response_hours', 'first_response_at', 'resolved_at']);
        });
    }
};