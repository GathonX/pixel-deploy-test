<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availability', function (Blueprint $table) {
            $table->id();
            
            // Relation utilisateur
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            // Configuration jour de la semaine
            $table->tinyInteger('day_of_week')->unsigned()->comment('0=Dimanche, 1=Lundi, ..., 6=Samedi');
            $table->boolean('is_active')->default(true);
            
            // Créneaux horaires
            $table->json('time_slots')->comment('Array des créneaux disponibles');
            
            // Configuration avancée
            $table->integer('slot_duration')->default(30)->comment('Durée d\'un créneau en minutes');
            $table->integer('buffer_time')->default(0)->comment('Temps de pause entre RDV en minutes');
            $table->time('day_start')->default('09:00')->comment('Début de journée');
            $table->time('day_end')->default('18:00')->comment('Fin de journée');
            
            // Metadata
            $table->json('settings')->nullable()->comment('Paramètres additionnels');
            
            $table->timestamps();
            
            // Index pour performance
            $table->index(['user_id', 'day_of_week']);
            $table->index(['is_active']);
            
            // Contraintes
            $table->unique(['user_id', 'day_of_week'], 'unique_user_day');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availability');
    }
};