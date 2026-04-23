<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('reservation_id')->nullable()->after('sprint_id');
            $table->enum('reservation_type', ['simple', 'booking'])->nullable()->after('reservation_id');
            $table->index(['reservation_id', 'reservation_type'], 'tasks_reservation_idx');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_reservation_idx');
            $table->dropColumn(['reservation_id', 'reservation_type']);
        });
    }
};
