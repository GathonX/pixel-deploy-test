<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 10);
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->string('name');
            $table->string('contact_email')->nullable();
            $table->string('phone')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('booking_supplier_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('booking_suppliers')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('booking_products')->onDelete('cascade');
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['supplier_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_supplier_prices');
        Schema::dropIfExists('booking_suppliers');
    }
};
