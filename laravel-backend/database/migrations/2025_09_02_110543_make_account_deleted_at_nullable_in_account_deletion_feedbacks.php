<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('account_deletion_feedbacks', function (Blueprint $table) {
            $table->timestamp('account_deleted_at')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('account_deletion_feedbacks', function (Blueprint $table) {
            $table->timestamp('account_deleted_at')->nullable(false)->change();
        });
    }
};
