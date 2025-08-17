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
        Schema::table('class_scholarships', function (Blueprint $table) {
            $table->foreignId('payment_tranche_id')->nullable()->constrained('payment_tranches')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_scholarships', function (Blueprint $table) {
            $table->dropForeign(['payment_tranche_id']);
            $table->dropColumn('payment_tranche_id');
        });
    }
};
