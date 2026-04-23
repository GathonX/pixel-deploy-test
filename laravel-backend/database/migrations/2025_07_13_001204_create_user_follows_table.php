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
        Schema::create('user_follows', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('follower_id'); // Utilisateur qui suit
            $table->unsignedBigInteger('following_id'); // Utilisateur suivi
            $table->timestamps();

            // Contraintes de clés étrangères
            $table->foreign('follower_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('following_id')->references('id')->on('users')->onDelete('cascade');

            // Index pour optimiser les requêtes
            $table->index(['follower_id', 'following_id']);
            $table->index(['following_id', 'follower_id']);

            // Contrainte unique pour éviter les doublons
            $table->unique(['follower_id', 'following_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_follows');
    }
};