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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->decimal('total_amount', 10, 2);
            $table->date('payment_date');
            $table->string('payment_method')->default('cash'); // cash, card, transfer, etc.
            $table->string('reference_number')->nullable(); // Pour les virements, chèques, etc.
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('cascade');
            $table->string('receipt_number')->unique(); // Numéro de reçu unique
            $table->timestamps();

            // Index pour optimiser les requêtes
            $table->index(['student_id', 'school_year_id']);
            $table->index(['payment_date']);
            $table->index(['receipt_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};