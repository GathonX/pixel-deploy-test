<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_media_post_category', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_media_post_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['social_media_post_id', 'category_id'], 'social_post_category_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_media_post_category');
    }
};