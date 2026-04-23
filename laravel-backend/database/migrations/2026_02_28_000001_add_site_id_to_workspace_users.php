<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('workspace_users', function (Blueprint $table) {
            $table->string('site_id')->nullable()->after('role');
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_users', function (Blueprint $table) {
            $table->dropForeign(['site_id']);
            $table->dropColumn('site_id');
        });
    }
};
