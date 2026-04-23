<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
             $table->string('author_name')->nullable();
              $table->string('author_email')->nullable();
            $table->string('user_fingerprint', 50)->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('commentable_type'); // BlogPost ou SocialMediaPost
            $table->unsignedBigInteger('commentable_id');
            $table->text('content');
            $table->integer('likes_count')->default(0); // Cache count pour performance
            $table->foreignId('parent_id')->nullable()->constrained('comments')->onDelete('cascade');
            $table->timestamps();

            // Index polymorphe
            $table->index(['commentable_type', 'commentable_id']);
            $table->index(['user_id']);
            $table->index(['parent_id']);
             $table->index(['user_fingerprint']);
            $table->index(['ip_address']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};


