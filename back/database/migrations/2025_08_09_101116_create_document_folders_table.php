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
        Schema::create('document_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('folder_type')->default('custom'); // custom, student, administration
            $table->string('color', 7)->default('#007bff'); // Couleur hexadécimale pour l'affichage
            $table->string('icon')->default('folder'); // Icône Bootstrap
            $table->foreignId('parent_folder_id')->nullable()->constrained('document_folders')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->boolean('is_system_folder')->default(false); // Pour les dossiers système
            $table->boolean('is_private')->default(false); // Dossier privé (visible que par le créateur)
            $table->json('allowed_roles')->nullable(); // Rôles autorisés à voir ce dossier
            $table->integer('sort_order')->default(0); // Ordre d'affichage
            $table->timestamps();
            
            // Index pour optimiser les requêtes
            $table->index(['folder_type']);
            $table->index(['created_by']);
            $table->index(['parent_folder_id']);
            $table->index(['is_system_folder']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_folders');
    }
};