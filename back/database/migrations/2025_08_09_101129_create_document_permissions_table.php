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
        Schema::create('document_permissions', function (Blueprint $table) {
            $table->id();
            $table->morphs('permissionable'); // Peut être un document ou un dossier
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('permission_type')->default('view'); // view, download, edit, delete
            $table->timestamp('granted_at')->nullable();
            $table->foreignId('granted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('expires_at')->nullable(); // Permission temporaire
            $table->timestamps();
            
            // Contrainte unique pour éviter les doublons
            $table->unique(['permissionable_type', 'permissionable_id', 'user_id', 'permission_type'], 'unique_permission');
            
            // Index pour optimiser les requêtes
            $table->index(['user_id']);
            $table->index(['permission_type']);
            $table->index(['expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_permissions');
    }
};