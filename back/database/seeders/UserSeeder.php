<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->createOrUpdateUser('admin', [
            'name' => 'Administrateur',
            'email' => 'admin@gsbpl.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        $this->createOrUpdateUser('prof.martin', [
            'name' => 'Professeur Martin',
            'email' => 'martin@gsbpl.com',
            'password' => Hash::make('password123'),
            'role' => 'teacher',
        ]);

        $this->createOrUpdateUser('comptable', [
            'name' => 'Comptable Dupont',
            'email' => 'comptable@gsbpl.com',
            'password' => Hash::make('password123'),
            'role' => 'accountant',
        ]);

        $this->createOrUpdateUser('surveillant', [
            'name' => 'Surveillant Général',
            'email' => 'surveillant@gsbpl.com',
            'password' => Hash::make('password123'),
            'role' => 'surveillant_general',
        ]);

        $this->createOrUpdateUser('user.test', [
            'name' => 'Utilisateur Test',
            'email' => 'user@gsbpl.com',
            'password' => Hash::make('password123'),
            'role' => 'user',
        ]);

        $this->createOrUpdateUser('prof.dubois', [
            'name' => 'Professeur Dubois',
            'email' => 'dubois@gsbpl.com',
            'password' => Hash::make('password123'),
            'role' => 'teacher',
        ]);

        $this->createOrUpdateUser('prof.ngomo', [
            'name' => 'Professeur Ngomo',
            'email' => 'ngomo@gsbpl.com',
            'password' => Hash::make('password123'),
            'role' => 'teacher',
        ]);

        echo "✅ Utilisateurs créés avec succès !\n";
        echo "==========================================\n";
        echo "Admin:            username: admin       | password: password123\n";
        echo "Surveillant Gén.: username: surveillant | password: password123\n";
        echo "Enseignant:       username: prof.martin | password: password123\n";
        echo "Comptable:        username: comptable   | password: password123\n";
        echo "Utilisateur:      username: user.test   | password: password123\n";
        echo "==========================================\n";
    }

    /**
     * Créer ou mettre à jour un utilisateur (force TOUJOURS la mise à jour du mot de passe)
     */
    private function createOrUpdateUser($username, $userData)
    {
        // TOUJOURS supprimer et recréer pour garantir un mot de passe fonctionnel
        $existingUser = User::where('username', $username)->first();
        if ($existingUser) {
            $existingUser->delete();
            echo "🗑️  Ancien utilisateur supprimé: {$username}\n";
        }
        
        // Créer avec un nouveau hash
        User::create(array_merge(['username' => $username], $userData));
        echo "✨ Utilisateur créé/recréé: {$username}\n";
    }
}
