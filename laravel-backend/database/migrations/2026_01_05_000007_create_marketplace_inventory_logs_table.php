<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_inventory_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('marketplace_products')->onDelete('cascade');
            $table->integer('quantity_change');
            $table->integer('previous_quantity');
            $table->integer('new_quantity');
            $table->enum('type', ['stock_in', 'stock_out', 'sale', 'return', 'adjustment']);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_inventory_logs');
    }
};
