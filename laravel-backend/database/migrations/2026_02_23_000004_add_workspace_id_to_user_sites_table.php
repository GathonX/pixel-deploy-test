<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sites', function (Blueprint $table) {
            $table->unsignedBigInteger('workspace_id')->nullable()->after('user_id');
            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->index('workspace_id');
        });
    }

    public function down(): void
    {
        Schema::table('user_sites', function (Blueprint $table) {
            $table->dropForeign(['workspace_id']);
            $table->dropIndex(['workspace_id']);
            $table->dropColumn('workspace_id');
        });
    }
};
