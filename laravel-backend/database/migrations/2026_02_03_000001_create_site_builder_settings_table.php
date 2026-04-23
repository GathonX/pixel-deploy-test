<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_builder_settings', function (Blueprint $table) {
            $table->id();
            $table->json('domain_settings')->nullable();
            $table->json('branding')->nullable();
            $table->json('limits')->nullable();
            $table->json('features')->nullable();
            $table->json('notifications')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_builder_settings');
    }
};
