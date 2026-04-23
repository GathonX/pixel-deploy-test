<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('session_id')->nullable();
            $table->foreignId('product_id')->constrained('marketplace_products')->onDelete('cascade');
            $table->integer('quantity')->default(1);
            $table->decimal('price_snapshot', 10, 2);
            $table->json('product_snapshot')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'product_id']);
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_carts');
    }
};
