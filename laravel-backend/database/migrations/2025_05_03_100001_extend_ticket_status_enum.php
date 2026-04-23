<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // ✅ Stratégie safe : ALTER TYPE pour ajouter de nouveaux statuts
        // sans affecter les données existantes
        Schema::table('tickets', function (Blueprint $table) {
            // On ne peut pas facilement modifier un ENUM avec Laravel Migrations
            // Utilisons RAW SQL pour étendre l'enum de manière sécurisée
        });
        
        // ✅ Méthode safe : d'abord modifier le type pour accepter les nouveaux statuts
        DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM(
            'open', 
            'pending', 
            'resolved',
            'in_progress',
            'waiting_info',
            'escalated'
        ) DEFAULT 'open'");
    }

    public function down(): void
    {
        // Revenir aux statuts originaux (attention : peut causer des erreurs si des données utilisent les nouveaux statuts)
        DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM('open', 'pending', 'resolved') DEFAULT 'open'");
    }
};