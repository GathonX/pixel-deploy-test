<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_products', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 10);
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['chambre', 'excursion', 'service']);
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('price_child', 10, 2)->default(0);
            $table->unsignedSmallInteger('capacity')->default(1)->comment('Pour chambre: nb personnes max. Pour excursion: nb participants max. Pour service: stock');
            $table->unsignedSmallInteger('max_capacity')->default(1);
            $table->unsignedSmallInteger('stock')->default(1);
            $table->string('image_url')->nullable();
            $table->text('parcours')->nullable()->comment('Itinéraire pour excursions');
            $table->json('amenities')->nullable()->comment('Liste des équipements/services inclus');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_products');
    }
};
