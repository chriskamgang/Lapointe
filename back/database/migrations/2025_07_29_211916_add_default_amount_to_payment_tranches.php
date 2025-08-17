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
            $table->decimal('default_amount', 10, 2)->nullable()->after('description')
                ->comment('Montant par défaut pour cette tranche (utilisé pour les tranches globales comme RAME)');
            $table->boolean('use_default_amount')->default(false)->after('default_amount')
                ->comment('Indique si cette tranche utilise le montant par défaut au lieu des montants par classe');
        });

        // Mettre à jour la tranche RAME existante
        DB::table('payment_tranches')
            ->where('name', 'RAME')
            ->update([
                'default_amount' => 5000,
                'use_default_amount' => true
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_tranches', function (Blueprint $table) {
            $table->dropColumn(['default_amount', 'use_default_amount']);
        });
    }
};
