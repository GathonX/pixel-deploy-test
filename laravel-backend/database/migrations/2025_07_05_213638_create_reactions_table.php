<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('reactable_type'); // Comment, BlogPost, SocialMediaPost
            $table->unsignedBigInteger('reactable_id');
            $table->enum('type', ['like', 'love', 'laugh', 'angry', 'sad'])->default('like');
            $table->timestamps();
            
            // Un utilisateur ne peut réagir qu'une fois par élément
            $table->unique(['user_id', 'reactable_type', 'reactable_id']);
            $table->index(['reactable_type', 'reactable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reactions');
    }
};