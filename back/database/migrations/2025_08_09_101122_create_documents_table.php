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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // Titre du document
            $table->text('description')->nullable(); // Description du document
            $table->string('original_filename'); // Nom original du fichier
            $table->string('stored_filename'); // Nom stocké sur le serveur
            $table->string('file_path'); // Chemin complet du fichier
            $table->string('file_extension', 10); // Extension du fichier
            $table->string('mime_type'); // Type MIME
            $table->bigInteger('file_size'); // Taille en octets
            $table->string('document_type')->default('general'); // Type de pièce jointe
            $table->foreignId('folder_id')->constrained('document_folders')->onDelete('cascade');
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('student_id')->nullable()->constrained('students')->onDelete('cascade'); // Pour les documents d'étudiants
            $table->string('visibility')->default('private'); // private, shared, public
            $table->json('tags')->nullable(); // Tags pour la recherche
            $table->integer('download_count')->default(0); // Nombre de téléchargements
            $table->timestamp('last_downloaded_at')->nullable();
            $table->boolean('is_archived')->default(false); // Document archivé
            $table->text('notes')->nullable(); // Notes personnelles
            $table->timestamps();
            
            // Index pour optimiser les requêtes
            $table->index(['folder_id']);
            $table->index(['uploaded_by']);
            $table->index(['student_id']);
            $table->index(['document_type']);
            $table->index(['visibility']);
            $table->index(['file_extension']);
            $table->index(['created_at']);
            
            // Index de recherche full-text
            $table->fullText(['title', 'description', 'original_filename']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};