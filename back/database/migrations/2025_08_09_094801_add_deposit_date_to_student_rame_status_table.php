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
        Schema::table('student_rame_status', function (Blueprint $table) {
            $table->date('deposit_date')->nullable()->after('marked_date')->comment('Date de dépôt physique de la RAME');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_rame_status', function (Blueprint $table) {
            $table->dropColumn('deposit_date');
        });
    }
};