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
        Schema::create('school_equipment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->onDelete('cascade');
            $table->string('equipment_type'); // 'clothing', 'medical', 'technical', 'security', 'academic'
            $table->string('item_name');
            $table->decimal('price', 10, 2);
            $table->string('category'); // 'blouse', 'polo', 'stethoscope', 'safety_equipment', etc.
            $table->text('description')->nullable();
            $table->boolean('is_mandatory')->default(false);
            $table->json('applicable_levels')->nullable(); // ['BTS', 'LICENCE', etc.]
            $table->json('applicable_specialties')->nullable(); // filières concernées
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();

            $table->index(['school_id', 'equipment_type']);
            $table->index(['school_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_equipment');
    }
};
