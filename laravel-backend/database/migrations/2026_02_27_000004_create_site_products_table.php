<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_products', function (Blueprint $table) {
            $table->id();

            $table->string('site_id', 20);
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');

            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->json('images')->nullable();  // tableau d'URLs

            // Prix de base (hors saisons)
            $table->unsignedInteger('base_price')->default(0);  // en Ariary

            // Prix saisonniers (JSON: {price, date_start, date_end} — date format: "MM-DD")
            $table->json('price_low_season')->nullable();
            $table->json('price_mid_season')->nullable();
            $table->json('price_high_season')->nullable();
            $table->json('price_peak_season')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('site_id');
            $table->index(['site_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_products');
    }
};
