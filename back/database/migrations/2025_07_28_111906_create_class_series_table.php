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
        Schema::create('class_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('school_classes')->onDelete('cascade');
            $table->string('name'); // A, B, C, etc.
            $table->string('code')->nullable(); // Code unique pour la série
            $table->integer('capacity')->default(50);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['class_id', 'is_active']);
            $table->unique(['class_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_series');
    }
};
