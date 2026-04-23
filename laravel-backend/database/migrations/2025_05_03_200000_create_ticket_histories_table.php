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
        Schema::create('ticket_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('action'); // 'created', 'updated', 'status_changed', 'assigned', etc.
            $table->string('field')->nullable(); // champ modifié (ex: 'status', 'priority')
            $table->text('old_value')->nullable(); // ancienne valeur
            $table->text('new_value')->nullable(); // nouvelle valeur
            $table->text('comment')->nullable(); // commentaire facultatif
            $table->timestamps();
            
            // Index pour optimiser les requêtes
            $table->index(['ticket_id', 'created_at']);
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_histories');
    }
};
