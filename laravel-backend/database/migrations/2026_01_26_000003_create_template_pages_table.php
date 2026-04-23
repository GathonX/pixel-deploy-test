<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_pages', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('template_id', 50);
            $table->string('name', 255);
            $table->string('slug', 100);
            $table->integer('order')->default(0);
            $table->timestamps();

            $table->foreign('template_id')
                ->references('id')
                ->on('site_templates')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_pages');
    }
};
