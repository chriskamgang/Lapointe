<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('equipment_distribution_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained()->onDelete('cascade');
            $table->enum('equipment_type', ['polo', 'blouse', 'laptop', 'rame']);
            $table->enum('action', ['payment_recorded', 'physical_received', 'equipment_distributed', 'status_updated']);
            $table->string('performed_by')->nullable();
            $table->decimal('amount', 10, 2)->nullable();
            $table->string('payment_method')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('performed_at')->useCurrent();
            $table->timestamps();

            $table->index(['student_id', 'equipment_type']);
            $table->index(['action', 'performed_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('equipment_distribution_log');
    }
};
