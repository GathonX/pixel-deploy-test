<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE booking_reservations MODIFY COLUMN status ENUM('pending','confirmed','cancelled','maintenance','checked_in','checked_out') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE booking_reservations MODIFY COLUMN status ENUM('pending','confirmed','cancelled','maintenance') NOT NULL DEFAULT 'pending'");
    }
};
