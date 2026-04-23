<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('full_name', 255)->nullable()->after('payment_proof_url');
            $table->string('email', 255)->nullable()->after('full_name');
            $table->string('contact_number', 50)->nullable()->after('email');
            $table->string('transaction_id', 255)->nullable()->after('contact_number');
            $table->text('user_message')->nullable()->after('transaction_id');
            $table->json('payment_proofs')->nullable()->after('user_message');
            $table->string('amount_claimed', 50)->nullable()->after('payment_proofs');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn([
                'full_name',
                'email',
                'contact_number',
                'transaction_id',
                'user_message',
                'payment_proofs',
                'amount_claimed',
            ]);
        });
    }
};
