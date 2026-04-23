<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('source', 50); // site-builder, studio-domain, marketplace
            $table->string('source_item_id', 100);
            $table->string('item_name', 255);
            $table->text('item_description')->nullable();
            $table->string('item_thumbnail', 500)->nullable();
            $table->decimal('total_eur', 10, 2);
            $table->unsignedBigInteger('total_ariary');
            $table->enum('status', ['pending', 'awaiting_payment', 'payment_submitted', 'confirmed', 'rejected', 'cancelled'])->default('pending');
            $table->string('payment_method', 50)->nullable();
            $table->string('payment_proof_url', 500)->nullable();
            $table->text('admin_note')->nullable();
            $table->unsignedBigInteger('confirmed_by')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'status']);
            $table->index(['source', 'source_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
