<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_feature_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('feature_id')->constrained()->onDelete('cascade');

            // Double contrôle
            $table->boolean('admin_enabled')->default(false); // Admin valide paiement
            $table->boolean('user_activated')->default(false); // User active fonctionnalité
            $table->timestamp('admin_enabled_at')->nullable();
            $table->timestamp('user_activated_at')->nullable();
            $table->foreignId('admin_enabled_by')->nullable()->constrained('users');

            // Infos paiement
            $table->decimal('amount_paid', 10, 2)->nullable();
            $table->string('payment_method')->nullable();
            $table->text('admin_notes')->nullable();

            // ✅ NOUVEAU : Système d'expiration mensuelle
            $table->timestamp('expires_at')->nullable()->comment('Date d\'expiration de la fonctionnalité (30 jours après activation)');

            $table->enum('status', ['pending', 'active', 'expired', 'suspended'])->default('pending');
            $table->timestamps();

            $table->unique(['user_id', 'feature_id']);

            // ✅ Index pour performance des vérifications d'expiration
            $table->index(['expires_at', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_feature_access');
    }
};
