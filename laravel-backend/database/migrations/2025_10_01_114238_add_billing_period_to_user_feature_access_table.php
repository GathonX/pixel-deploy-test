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
        Schema::table('user_feature_access', function (Blueprint $table) {
            // Ajouter la période de facturation (monthly ou yearly)
            $table->enum('billing_period', ['monthly', 'yearly'])->default('monthly')->after('amount_paid');

            // Ajouter le montant d'origine (avant réduction) pour traçabilité
            $table->decimal('original_price', 10, 2)->nullable()->after('billing_period');

            // Ajouter la réduction appliquée (en pourcentage)
            $table->decimal('discount_percentage', 5, 2)->default(0)->after('original_price');
        });

        Schema::table('feature_activation_requests', function (Blueprint $table) {
            // Ajouter la période de facturation pour les demandes
            $table->enum('billing_period', ['monthly', 'yearly'])->default('monthly')->after('amount_claimed');

            // Ajouter le montant d'origine
            $table->decimal('original_price', 10, 2)->nullable()->after('billing_period');

            // Ajouter la réduction appliquée
            $table->decimal('discount_percentage', 5, 2)->default(0)->after('original_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_feature_access', function (Blueprint $table) {
            $table->dropColumn(['billing_period', 'original_price', 'discount_percentage']);
        });

        Schema::table('feature_activation_requests', function (Blueprint $table) {
            $table->dropColumn(['billing_period', 'original_price', 'discount_percentage']);
        });
    }
};
