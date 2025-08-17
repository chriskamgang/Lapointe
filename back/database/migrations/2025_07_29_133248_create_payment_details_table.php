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
        Schema::create('payment_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained('payments')->onDelete('cascade');
            $table->foreignId('payment_tranche_id')->constrained('payment_tranches')->onDelete('cascade');
            $table->decimal('amount_allocated', 10, 2); // Montant alloué à cette tranche lors de ce paiement
            $table->decimal('previous_amount', 10, 2)->default(0); // Montant précédemment payé pour cette tranche
            $table->decimal('new_total_amount', 10, 2); // Nouveau total payé pour cette tranche
            $table->boolean('is_fully_paid')->default(false); // Si cette tranche est entièrement payée
            $table->timestamps();

            // Index pour optimiser les requêtes
            $table->index(['payment_id']);
            $table->index(['payment_tranche_id']);
            $table->unique(['payment_id', 'payment_tranche_id']); // Un paiement ne peut avoir qu'un détail par tranche
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_details');
    }
};