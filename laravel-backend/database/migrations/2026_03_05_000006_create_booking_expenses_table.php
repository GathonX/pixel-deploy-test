<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_expenses', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 10);
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->string('label');
            $table->decimal('amount', 10, 2);
            $table->foreignId('product_id')->nullable()->constrained('booking_products')->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('booking_suppliers')->nullOnDelete();
            $table->date('expense_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('site_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_expenses');
    }
};
