<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_reservations', function (Blueprint $table) {
            $table->decimal('price_override', 12, 2)->nullable()->after('notes')
                  ->comment('Prix total manuel (remplace le calcul automatique)');
        });
    }

    public function down(): void
    {
        Schema::table('booking_reservations', function (Blueprint $table) {
            $table->dropColumn('price_override');
        });
    }
};
