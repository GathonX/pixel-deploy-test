<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Supprime les templates du module studio (renommé en studio-domaine)
     */
    public function up(): void
    {
        // D'abord supprimer la contrainte de clé étrangère si elle existe
        Schema::table('studio_requests', function (Blueprint $table) {
            // Supprimer la clé étrangère vers studio_templates
            $table->dropForeign(['template_id']);

            // Supprimer la colonne template_id
            $table->dropColumn('template_id');
        });

        // Supprimer la table studio_templates
        Schema::dropIfExists('studio_templates');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recréer la table studio_templates
        Schema::create('studio_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category');
            $table->text('description')->nullable();
            $table->string('thumbnail')->nullable();
            $table->string('preview_url')->nullable();
            $table->json('features')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_premium')->default(false);
            $table->integer('usage_count')->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
            $table->index('sort_order');
        });

        // Recréer la colonne template_id dans studio_requests
        Schema::table('studio_requests', function (Blueprint $table) {
            $table->foreignId('template_id')->nullable()->after('user_id')->constrained('studio_templates')->nullOnDelete();
        });
    }
};
