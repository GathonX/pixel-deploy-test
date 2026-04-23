<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('weekly_content_objectives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->string('week_identifier'); // Format: 2024-W52 (année-semaine)
            $table->enum('content_type', ['blog', 'social_media']);
            $table->json('objectives'); // 7 objectifs avec title, keywords, seo_focus
            $table->boolean('is_generated')->default(false);
            $table->timestamp('week_start_date');
            $table->timestamp('week_end_date');
            $table->timestamps();

            // Index pour performance avec noms courts
            $table->index(['project_id', 'week_identifier', 'content_type'], 'wco_project_week_type_idx');
            $table->unique(['project_id', 'week_identifier', 'content_type'], 'wco_project_week_type_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('weekly_content_objectives');
    }
};
