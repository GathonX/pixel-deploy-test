<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_sections', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('page_id', 50);
            $table->string('section_type_id', 50);
            $table->integer('order')->default(0);
            $table->json('content')->nullable();
            $table->json('styles')->nullable();
            $table->timestamps();

            $table->foreign('page_id')
                ->references('id')
                ->on('site_pages')
                ->onDelete('cascade');

            $table->foreign('section_type_id')
                ->references('id')
                ->on('section_types')
                ->onDelete('cascade');

            $table->index(['page_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_sections');
    }
};
