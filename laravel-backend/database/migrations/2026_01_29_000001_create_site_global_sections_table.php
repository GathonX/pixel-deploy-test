<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_global_sections', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('site_id', 50);
            $table->string('section_type_id', 50);
            $table->enum('position', ['navbar', 'footer']); // Position globale
            $table->json('content')->nullable();
            $table->json('styles')->nullable();
            $table->timestamps();

            $table->foreign('site_id')
                ->references('id')
                ->on('user_sites')
                ->onDelete('cascade');

            $table->foreign('section_type_id')
                ->references('id')
                ->on('section_types')
                ->onDelete('cascade');

            // Un seul navbar et un seul footer par site
            $table->unique(['site_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_global_sections');
    }
};
