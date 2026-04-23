<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_settings', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 10);
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->string('key', 100);
            $table->longText('value')->nullable();
            $table->timestamps();

            $table->unique(['site_id', 'key']);
            // Clés: cgv_content (HTML), devis_config (JSON: nom, adresse, phone, email, couleur, devise)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_settings');
    }
};
