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
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('subname')->nullable();
            $table->foreignId('class_series_id')->constrained()->onDelete('cascade');
            $table->string('email')->nullable();
            $table->string('phone_number')->nullable();
            $table->date('birthday')->nullable();
            $table->string('birthday_place')->nullable();
            $table->enum('sex', ['m', 'f']);
            $table->string('father_name')->nullable();
            $table->string('profession')->nullable();
            $table->enum('status', ['new', 'old'])->default('new');
            $table->boolean('is_new')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['class_series_id', 'is_active']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
