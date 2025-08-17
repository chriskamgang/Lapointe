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
        Schema::table('students', function (Blueprint $table) {
            // Rendre les anciens champs nullable pour compatibilité
            $table->string('name')->nullable()->change();
            $table->enum('sex', ['m', 'f'])->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Remettre les anciens champs comme requis
            $table->string('name')->nullable(false)->change();
            $table->enum('sex', ['m', 'f'])->nullable(false)->change();
        });
    }
};