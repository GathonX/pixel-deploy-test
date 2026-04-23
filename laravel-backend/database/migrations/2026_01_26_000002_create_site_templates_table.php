<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_templates', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('category', 100)->nullable();
            $table->string('thumbnail', 500)->nullable();
            $table->string('version', 20)->default('1.0.0');
            $table->enum('status', ['draft', 'active', 'archived'])->default('draft');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_templates');
    }
};
