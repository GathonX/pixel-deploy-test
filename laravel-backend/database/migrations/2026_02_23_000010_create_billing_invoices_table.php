<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workspace_id');
            $table->string('site_id', 50)->nullable();
            $table->enum('subscription_scope', ['workspace', 'site'])->default('workspace');
            $table->string('invoice_number', 50)->unique();
            $table->string('plan_key', 50)->nullable(); // starter, pro, premium
            $table->enum('billing_period', ['monthly', 'yearly'])->default('monthly');
            $table->unsignedInteger('amount_ariary');
            $table->char('currency', 3)->default('MGA');
            $table->enum('status', ['draft', 'issued', 'paid', 'overdue', 'void'])->default('issued');
            $table->string('payment_method', 80)->nullable(); // orange_money, bank_transfer, mvola...
            $table->string('payment_reference', 20)->nullable()->unique();
            $table->text('payment_proof_url')->nullable();
            $table->unsignedBigInteger('confirmed_by')->nullable(); // admin qui valide
            $table->dateTime('due_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('set null');
            $table->foreign('confirmed_by')->references('id')->on('users')->onDelete('set null');
            $table->index('workspace_id');
            $table->index('site_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_invoices');
    }
};
