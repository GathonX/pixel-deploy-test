<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('summary');
            $table->longText('content');
            $table->string('header_image')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->enum('status', ['draft', 'scheduled', 'published'])->default('draft');
            $table->time('scheduled_time')->nullable();
            $table->integer('likes')->default(0);
            $table->integer('views')->default(0);
            $table->boolean('is_ai_generated')->default(true);
            $table->json('generation_context')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();
            
            // Index pour performance
            $table->index(['user_id', 'status']);
            $table->index(['slug']);
            $table->index(['published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};