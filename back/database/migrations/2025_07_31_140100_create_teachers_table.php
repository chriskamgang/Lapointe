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
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->string('first_name'); // Prénom
            $table->string('last_name'); // Nom de famille
            $table->string('phone_number'); // Numéro de téléphone (obligatoire)
            $table->string('email')->nullable(); // Email optionnel
            $table->text('address')->nullable(); // Adresse optionnelle
            $table->date('date_of_birth')->nullable(); // Date de naissance
            $table->enum('gender', ['m', 'f'])->nullable(); // Genre
            $table->string('qualification')->nullable(); // Qualification/diplôme
            $table->date('hire_date')->nullable(); // Date d'embauche
            $table->boolean('is_active')->default(true); // Enseignant actif/inactif
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null'); // Lien vers compte utilisateur
            $table->timestamps();
            
            // Index pour optimiser les requêtes
            $table->index(['is_active']);
            $table->index(['phone_number']);
            $table->index(['last_name', 'first_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teachers');
    }
};