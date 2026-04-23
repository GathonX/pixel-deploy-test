<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateContactMessagesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->comment('ID du client/utilisateur associé');
            $table->string('name')->nullable()->comment('Nom de l\'expéditeur');
            $table->string('email')->nullable()->comment('Email de l\'expéditeur');
            $table->text('message')->nullable()->comment('Contenu du message');
            
            // Métadonnées enrichies pour le suivi et la sécurité
            $table->string('source')->nullable()->default('embed')->comment('Source du message (embed, manual, etc.)');
            $table->enum('status', ['new', 'read', 'processed', 'archived', 'spam'])->default('new');
            
            // Informations supplémentaires de contexte
            $table->string('client_origin')->nullable()->comment('Origine du site web client');
            $table->string('user_agent')->nullable()->comment('User Agent du navigateur');
            $table->string('ip_address')->nullable()->comment('Adresse IP de l\'expéditeur');
            
            // Métadonnées JSON pour flexibilité
            $table->json('metadata')->nullable()->comment('Métadonnées supplémentaires flexibles');
            
            // Timestamps
            $table->timestamps();
            
            // Index pour optimisation des requêtes
            $table->index('user_id');
            $table->index('email');
            $table->index('source');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('contact_messages');
    }
}
