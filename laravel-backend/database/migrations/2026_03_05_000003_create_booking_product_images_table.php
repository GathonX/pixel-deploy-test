<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('booking_products')->onDelete('cascade');
            $table->string('url');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_product_images');
    }
};
