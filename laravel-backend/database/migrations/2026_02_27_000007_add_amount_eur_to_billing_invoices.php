<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->decimal('amount_eur', 8, 2)->nullable()->after('amount_ariary');
        });
    }

    public function down(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->dropColumn('amount_eur');
        });
    }
};
