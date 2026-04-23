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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            
            // Client identification
            $table->string('client_id')->index();
            
            // Form data from specification
            $table->string('name')->nullable(); // Nullable pour formulaire partiel
            $table->string('email')->nullable(); // Nullable pour formulaire partiel
            $table->string('phone')->nullable();
            $table->date('date'); // Requis dans les deux formulaires
            $table->time('time')->nullable(); // Nullable pour formulaire partiel
            $table->integer('guests'); // Requis dans les deux formulaires
            $table->text('interest_description')->nullable(); // Requis dans formulaire partiel
            $table->text('additional_details')->nullable(); // Optionnel
            
            // Smart completion system
            $table->boolean('is_partial')->default(false); // true = formulaire partiel
            $table->string('completion_token')->nullable()->unique(); // Token pour complétion
            $table->timestamp('completed_at')->nullable(); // Date de complétion
            
            // Metadata
            $table->json('metadata')->nullable(); // Données supplémentaires flexibles
            $table->string('status')->default('pending'); // pending, confirmed, cancelled
            $table->string('source')->default('iframe'); // iframe1, iframe2, api, manual
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            
            $table->timestamps();
            
            // Indexes pour performance
            $table->index(['client_id', 'date']);
            $table->index(['client_id', 'status']);
            $table->index(['client_id', 'is_partial']);
            $table->index('completion_token');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};