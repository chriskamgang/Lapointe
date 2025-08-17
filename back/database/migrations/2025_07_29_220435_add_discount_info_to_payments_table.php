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
        Schema::table('payments', function (Blueprint $table) {
            $table->boolean('has_scholarship')->default(false)->after('is_rame_physical')
                ->comment('Indique si ce paiement bénéficie d\'une bourse');
            $table->decimal('scholarship_amount', 10, 2)->default(0)->after('has_scholarship')
                ->comment('Montant de la bourse appliquée');
            $table->boolean('has_reduction')->default(false)->after('scholarship_amount')
                ->comment('Indique si ce paiement bénéficie d\'une réduction');
            $table->decimal('reduction_amount', 10, 2)->default(0)->after('has_reduction')
                ->comment('Montant de la réduction appliquée');
            $table->string('discount_reason')->nullable()->after('reduction_amount')
                ->comment('Motif du rabais (bourse/réduction)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'has_scholarship',
                'scholarship_amount', 
                'has_reduction',
                'reduction_amount',
                'discount_reason'
            ]);
        });
    }
};
