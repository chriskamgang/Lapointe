<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Ajouter le nouveau rôle 'comptable_superieur' dans la colonne role 
        // en modifiant l'enum pour inclure ce nouveau rôle
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'teacher', 'accountant', 'user', 'surveillant_general', 'general_accountant', 'comptable_superieur') NOT NULL DEFAULT 'user'");
        
        // Log de l'opération
        \Log::info('Migration: Ajout du rôle comptable_superieur dans la table users');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Vérifier s'il y a des utilisateurs avec le rôle comptable_superieur
        $comptableSuperieurExists = DB::table('users')->where('role', 'comptable_superieur')->exists();
        
        if ($comptableSuperieurExists) {
            throw new Exception('Impossible de supprimer le rôle comptable_superieur : des utilisateurs ont encore ce rôle assigné.');
        }
        
        // Revenir à l'enum sans le rôle comptable_superieur
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'teacher', 'accountant', 'user', 'surveillant_general', 'general_accountant') NOT NULL DEFAULT 'user'");
        
        \Log::info('Migration: Suppression du rôle comptable_superieur de la table users');
    }
};