<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // ✅ Colonnes personnalisées conservées
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('status', ['unread', 'read', 'archived'])->default('unread');
            $table->string('title')->nullable();
            $table->text('message')->nullable();
            $table->string('href')->nullable();
            $table->string('category')->nullable();
            $table->json('tags')->nullable();
            $table->boolean('show_badge')->default(true);
            $table->timestamp('expires_at')->nullable();

            // Index pour performance (morphs crée déjà l'index notifiable)
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'created_at']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
