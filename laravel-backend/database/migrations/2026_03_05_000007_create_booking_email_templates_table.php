<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 10);
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->enum('type', ['confirmation', 'reminder', 'review']);
            $table->string('subject');
            $table->longText('body_html');
            $table->timestamps();

            $table->unique(['site_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_email_templates');
    }
};
