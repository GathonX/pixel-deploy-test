<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sprint_id')
                  ->nullable()
                  ->constrained()
                  ->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->enum('type', ['mission', 'vision', 'objective', 'action'])->default('action');
            $table->enum('priority', ['high', 'medium', 'low', 'normal'])->default('normal');
            $table->enum('status', ['pending', 'in-progress', 'completed'])->default('pending');
            $table->date('scheduled_date');
            $table->timestamp('completed_at')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();

            // Index to quickly find tasks by date
            $table->index('scheduled_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};