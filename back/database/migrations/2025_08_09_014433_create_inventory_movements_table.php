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
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->enum('type', ['in', 'out', 'adjustment']); // Entrée, Sortie, Ajustement
            $table->integer('quantity_before'); // Quantité avant mouvement
            $table->integer('quantity_change'); // Changement de quantité (+/-)
            $table->integer('quantity_after'); // Quantité après mouvement
            $table->string('reason'); // Raison du mouvement
            $table->text('notes')->nullable(); // Notes additionnelles
            $table->string('user_name')->nullable(); // Nom de l'utilisateur
            $table->integer('user_id')->nullable(); // ID utilisateur (si disponible)
            $table->date('movement_date'); // Date du mouvement
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
