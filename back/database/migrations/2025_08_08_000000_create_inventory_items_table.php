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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('categorie');
            $table->integer('quantite')->default(0);
            $table->integer('quantite_min')->default(0);
            $table->enum('etat', ['Excellent', 'Bon', 'Moyen', 'Mauvais', 'Hors service'])->default('Bon');
            $table->string('localisation');
            $table->string('responsable');
            $table->date('date_achat')->nullable();
            $table->decimal('prix', 10, 2)->default(0);
            $table->string('numero_serie')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            // Index pour améliorer les performances des recherches
            $table->index(['categorie', 'etat']);
            $table->index(['quantite', 'quantite_min']);
            $table->index('localisation');
            $table->index('responsable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};