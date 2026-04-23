<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_media_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('platform', ['facebook', 'instagram', 'twitter', 'linkedin']);
            $table->text('content');
            $table->json('images')->nullable();
            $table->string('video')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->enum('status', ['draft', 'scheduled', 'published'])->default('draft');
            $table->time('scheduled_time')->nullable();
            $table->integer('likes')->default(0);
            $table->integer('comments')->default(0);
            $table->integer('shares')->default(0);
            $table->integer('views')->default(0);
            $table->boolean('is_ai_generated')->default(true);
            $table->json('generation_context')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            // Index pour performance
            $table->index(['user_id', 'platform']);
            $table->index(['status', 'published_at']);
            $table->index(['platform', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_media_posts');
    }
};
