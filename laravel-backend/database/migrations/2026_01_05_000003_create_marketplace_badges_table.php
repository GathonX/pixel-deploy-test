<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('marketplace_products')->onDelete('cascade');
            $table->enum('badge_type', ['promotion', 'new', 'hot', 'sale', 'limited']);
            $table->string('badge_text', 50);
            $table->string('badge_color', 20)->default('#2563eb');
            $table->integer('discount_percentage')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_badges');
    }
};
