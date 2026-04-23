<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('feature_activation_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('feature_id')->constrained()->onDelete('cascade');

            // Infos paiement soumises par user
            $table->string('full_name')->nullable();
            $table->decimal('amount_claimed', 10, 2);
            $table->string('payment_method');
            $table->json('payment_proofs'); // Array de fichiers (images/PDF)
            $table->text('user_message')->nullable();
            $table->string('email')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('transaction_id')->nullable();

            // Traitement admin
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('processed_by')->nullable()->constrained('users');
            $table->text('admin_response')->nullable();
            $table->timestamp('processed_at')->nullable();

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('feature_activation_requests');
    }
};

