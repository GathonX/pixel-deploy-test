<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ticket_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nom du template
            $table->string('category')->nullable(); // Catégorie (optionnel)
            $table->text('content'); // Contenu du template
            $table->boolean('is_active')->default(true); // Actif/inactif
            $table->integer('usage_count')->default(0); // Compteur d'utilisation
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_templates');
    }
};