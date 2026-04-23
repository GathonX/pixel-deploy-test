<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_templates', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->nullable()->after('status');
            $table->unsignedBigInteger('price_ariary')->nullable()->after('price');
            $table->boolean('is_premium')->default(false)->after('price_ariary');
        });
    }

    public function down(): void
    {
        Schema::table('site_templates', function (Blueprint $table) {
            $table->dropColumn(['price', 'price_ariary', 'is_premium']);
        });
    }
};
