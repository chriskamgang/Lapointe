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
        Schema::create('class_scholarships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_class_id')->constrained('school_classes')->onDelete('cascade');
            $table->string('name')->comment('Nom de la bourse');
            $table->text('description')->nullable();
            $table->decimal('amount', 10, 2)->comment('Montant de la bourse en FCFA');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['school_class_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_scholarships');
    }
};
