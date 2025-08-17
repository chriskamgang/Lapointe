<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class SetupTestUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'setup:test-users';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Setup test users for a fresh installation';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Configuration des utilisateurs de test pour nouvelle installation...');
        
        $testUsers = [
            'admin' => [
                'name' => 'Administrateur',
                'email' => 'admin@gsbpl.com',
                'role' => 'admin',
            ],
            'comptable' => [
                'name' => 'Comptable Dupont',
                'email' => 'comptable@gsbpl.com',
                'role' => 'accountant',
            ],
            'prof.martin' => [
                'name' => 'Professeur Martin',
                'email' => 'martin@gsbpl.com',
                'role' => 'teacher',
            ],
            'user.test' => [
                'name' => 'Utilisateur Test',
                'email' => 'user@gsbpl.com',
                'role' => 'user',
            ]
        ];
        
        foreach ($testUsers as $username => $userData) {
            // Supprimer l'ancien utilisateur s'il existe
            $existingUser = User::where('username', $username)->first();
            if ($existingUser) {
                $existingUser->delete();
                $this->line("🗑️  Ancien utilisateur supprimé: {$username}");
            }
            
            // Créer le nouvel utilisateur avec un mot de passe fraîchement haché
            User::create([
                'username' => $username,
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => Hash::make('password123'),
                'role' => $userData['role'],
            ]);
            
            $this->line("✅ Utilisateur créé: <comment>{$username}</comment> ({$userData['role']})");
        }
        
        $this->newLine();
        $this->info('🎉 Utilisateurs de test configurés avec succès !');
        $this->table(
            ['Username', 'Password', 'Role'],
            [
                ['admin', 'password123', 'Administrateur'],
                ['comptable', 'password123', 'Comptable'],
                ['prof.martin', 'password123', 'Enseignant'],
                ['user.test', 'password123', 'Utilisateur'],
            ]
        );
        
        $this->newLine();
        $this->warn('⚠️  Ces comptes sont pour les tests uniquement !');
        $this->warn('   Changez les mots de passe en production.');
        
        return Command::SUCCESS;
    }
}