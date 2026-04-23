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
        Schema::create('content_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->morphs('preferable'); // preferable_type, preferable_id (déjà indexé automatiquement)
            $table->enum('preference', ['interested', 'not_interested']);
            $table->timestamps();

            // Un utilisateur ne peut avoir qu'une seule préférence par contenu
            $table->unique(['user_id', 'preferable_type', 'preferable_id']);

            // Index pour améliorer les performances
            $table->index('preference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_preferences');
    }
};
