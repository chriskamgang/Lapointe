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
        // Récupérer l'ID du premier admin pour créer les dossiers système
        $adminUser = DB::table('users')->where('role', 'admin')->first();
        
        if (!$adminUser) {
            // Si pas d'admin, prendre le premier utilisateur
            $adminUser = DB::table('users')->first();
        }
        
        if (!$adminUser) {
            // Si pas d'utilisateur du tout, on ne peut pas créer les dossiers
            return;
        }
        
        $now = now();
        
        // Créer les dossiers système par défaut
        $folders = [
            [
                'name' => 'Dossiers Étudiants',
                'description' => 'Documents relatifs aux étudiants (bulletins, certificats, etc.)',
                'folder_type' => 'student',
                'color' => '#28a745',
                'icon' => 'person-lines-fill',
                'created_by' => $adminUser->id,
                'is_system_folder' => true,
                'is_private' => false,
                'allowed_roles' => json_encode(['admin', 'accountant', 'teacher']),
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Administration',
                'description' => 'Documents administratifs et de gestion',
                'folder_type' => 'administration',
                'color' => '#dc3545',
                'icon' => 'building',
                'created_by' => $adminUser->id,
                'is_system_folder' => true,
                'is_private' => false,
                'allowed_roles' => json_encode(['admin', 'accountant']),
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Documents Personnels',
                'description' => 'Espace personnel pour vos documents privés',
                'folder_type' => 'custom',
                'color' => '#6f42c1',
                'icon' => 'person-badge',
                'created_by' => $adminUser->id,
                'is_system_folder' => true,
                'is_private' => true,
                'allowed_roles' => null,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Partage',
                'description' => 'Documents partagés entre le personnel',
                'folder_type' => 'custom',
                'color' => '#17a2b8',
                'icon' => 'share',
                'created_by' => $adminUser->id,
                'is_system_folder' => true,
                'is_private' => false,
                'allowed_roles' => json_encode(['admin', 'accountant', 'teacher']),
                'sort_order' => 4,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];
        
        DB::table('document_folders')->insert($folders);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('document_folders')->where('is_system_folder', true)->delete();
    }
};