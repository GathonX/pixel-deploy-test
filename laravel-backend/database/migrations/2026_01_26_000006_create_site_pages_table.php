<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_pages', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('site_id', 50);
            $table->string('name', 255);
            $table->string('slug', 100);
            $table->integer('order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            $table->foreign('site_id')
                ->references('id')
                ->on('user_sites')
                ->onDelete('cascade');

            $table->index(['site_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_pages');
    }
};
