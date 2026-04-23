<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_sites', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('name', 255);
            $table->string('source_template_id', 50);
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->json('global_styles')->nullable();
            $table->json('seo_config')->nullable();
            $table->string('preview_token', 100)->unique();
            $table->string('subdomain', 100)->nullable()->unique();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('source_template_id')
                ->references('id')
                ->on('site_templates')
                ->onDelete('restrict');

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_sites');
    }
};
