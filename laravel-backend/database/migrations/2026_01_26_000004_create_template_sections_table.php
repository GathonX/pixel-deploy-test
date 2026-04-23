<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_sections', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('template_page_id', 50);
            $table->string('section_type_id', 50);
            $table->integer('order')->default(0);
            $table->json('default_content')->nullable();
            $table->json('default_styles')->nullable();
            $table->timestamps();

            $table->foreign('template_page_id')
                ->references('id')
                ->on('template_pages')
                ->onDelete('cascade');

            $table->foreign('section_type_id')
                ->references('id')
                ->on('section_types')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_sections');
    }
};
