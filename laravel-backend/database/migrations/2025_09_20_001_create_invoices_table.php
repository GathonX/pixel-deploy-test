<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateInvoicesTable extends Migration
{
    public function up()
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('feature_id')->nullable();
            $table->unsignedBigInteger('feature_activation_request_id')->nullable();
            
            $table->string('invoice_number')->unique();
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('EUR');
            
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->string('billing_period')->nullable(); // monthly, yearly
            
            $table->date('due_date');
            $table->string('pdf_path')->nullable();
            
            $table->boolean('is_paid')->default(false);
            $table->timestamp('payment_date')->nullable();
            
            $table->json('metadata')->nullable();
            
            $table->string('payment_reference')->nullable()->unique();
            $table->string('payment_method')->nullable();
            $table->json('payment_instructions')->nullable();
            
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('feature_id')->references('id')->on('features')->onDelete('set null');
            $table->foreign('feature_activation_request_id')->references('id')->on('feature_activation_requests')->onDelete('set null');
            
            // Indexes
            $table->index('invoice_number');
            $table->index('user_id');
            $table->index('feature_id');
            $table->index('status');
            $table->index('is_paid');
        });
    }

    public function down()
    {
        Schema::dropIfExists('invoices');
    }
}
