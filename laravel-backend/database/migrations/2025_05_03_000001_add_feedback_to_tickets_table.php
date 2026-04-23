<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // ✅ Colonnes feedback de satisfaction
            $table->integer('satisfaction_rating')->nullable()->after('resolved_at'); // 1-5 étoiles
            $table->text('satisfaction_comment')->nullable()->after('satisfaction_rating'); // Commentaire optionnel
            $table->timestamp('feedback_submitted_at')->nullable()->after('satisfaction_comment'); // Date feedback
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['satisfaction_rating', 'satisfaction_comment', 'feedback_submitted_at']);
        });
    }
};