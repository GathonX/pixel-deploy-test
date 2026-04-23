<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('booking_products')->onDelete('cascade');
            $table->string('site_id', 10);
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->string('client_name');
            $table->string('client_email')->nullable();
            $table->string('client_phone')->nullable();
            $table->string('client_country')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'maintenance'])->default('pending');
            $table->tinyInteger('adults')->unsigned()->default(1);
            $table->tinyInteger('children')->unsigned()->default(0);
            $table->text('notes')->nullable();
            $table->json('history')->nullable()->comment('[{action, date, by}, ...]');
            $table->foreignId('linked_product_id')->nullable()->constrained('booking_products')->nullOnDelete();
            $table->timestamps();

            $table->index(['site_id', 'status']);
            $table->index(['product_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_reservations');
    }
};
