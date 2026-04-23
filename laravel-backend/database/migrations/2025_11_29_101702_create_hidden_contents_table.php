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
        Schema::create('hidden_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->morphs('hideable'); // hideable_type, hideable_id (déjà indexé automatiquement)
            $table->timestamps();

            // Un utilisateur ne peut masquer qu'une seule fois un contenu
            $table->unique(['user_id', 'hideable_type', 'hideable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hidden_contents');
    }
};
