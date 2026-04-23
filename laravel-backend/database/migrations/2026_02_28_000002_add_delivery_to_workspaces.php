<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->timestamp('delivered_at')->nullable()->after('deleted_at');
            $table->unsignedBigInteger('delivered_to_user_id')->nullable()->after('delivered_at');
            $table->foreign('delivered_to_user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->dropForeign(['delivered_to_user_id']);
            $table->dropColumn(['delivered_at', 'delivered_to_user_id']);
        });
    }
};
