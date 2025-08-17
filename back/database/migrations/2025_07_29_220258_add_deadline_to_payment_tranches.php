<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payment_tranches', function (Blueprint $table) {
            $table->date('deadline')->nullable()->after('use_default_amount')
                ->comment('Date limite de paiement pour cette tranche');
        });

        // Ajouter des deadlines par défaut aux tranches existantes
        DB::table('payment_tranches')->where('name', 'like', '%1%')->update(['deadline' => '2024-10-04']);
        DB::table('payment_tranches')->where('name', 'like', '%2%')->update(['deadline' => '2024-11-06']);
        DB::table('payment_tranches')->where('name', 'like', '%3%')->update(['deadline' => '2025-01-04']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_tranches', function (Blueprint $table) {
            $table->dropColumn('deadline');
        });
    }
};
