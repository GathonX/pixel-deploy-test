<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('studio_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category'); // Business, Créatif, Restauration, E-commerce, etc.
            $table->text('description')->nullable();
            $table->string('thumbnail')->nullable(); // URL de l'image de prévisualisation
            $table->string('preview_url')->nullable(); // URL de démo du template
            $table->json('features')->nullable(); // Liste des fonctionnalités
            $table->decimal('price', 10, 2)->default(0); // Prix du template (0 = gratuit)
            $table->boolean('is_active')->default(true);
            $table->boolean('is_premium')->default(false);
            $table->integer('usage_count')->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('studio_templates');
    }
};
