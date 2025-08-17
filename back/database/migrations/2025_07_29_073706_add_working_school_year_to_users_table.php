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
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('working_school_year_id')
                  ->nullable()
                  ->after('role')
                  ->constrained('school_years')
                  ->onDelete('set null');
                  
            $table->index('working_school_year_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['working_school_year_id']);
            $table->dropColumn('working_school_year_id');
        });
    }
};
