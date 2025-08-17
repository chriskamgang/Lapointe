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
        Schema::create('class_payment_amounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('school_classes')->onDelete('cascade');
            $table->foreignId('payment_tranche_id')->constrained()->onDelete('cascade');
            $table->decimal('amount_new_students', 10, 2);
            $table->decimal('amount_old_students', 10, 2);
            $table->boolean('is_required')->default(true);
            $table->timestamps();
            
            $table->unique(['class_id', 'payment_tranche_id']);
            $table->index(['class_id']);
            $table->index(['payment_tranche_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_payment_amounts');
    }
};
