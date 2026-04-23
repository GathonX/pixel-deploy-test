<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();

            // Identifiant métier (utilisé comme FK dans workspace_subscriptions)
            $table->string('plan_key', 30)->unique(); // starter, pro, premium

            // Infos affichage
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_popular')->default(false);
            $table->boolean('is_recommended')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);

            // Tarification (en Ariary)
            $table->unsignedInteger('price_ariary_monthly')->default(0);
            $table->unsignedInteger('price_ariary_yearly')->nullable();

            // Règles métier PixelRise Workspace
            $table->unsignedTinyInteger('max_published_sites')->default(1);
            $table->boolean('ai_enabled')->default(false);
            $table->unsignedTinyInteger('included_languages_per_site')->default(1);
            $table->unsignedInteger('extra_language_price_ariary')->default(15000);

            // Limites utilisateurs
            $table->unsignedTinyInteger('max_users')->default(1);

            // Features JSON (liste des features marketing pour l'affichage)
            $table->json('features')->nullable();

            $table->timestamps();

            $table->index('plan_key');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
