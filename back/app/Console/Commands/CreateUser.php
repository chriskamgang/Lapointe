<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:create {--name=} {--username=} {--email=} {--password=} {--role=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Créer un nouvel utilisateur pour le système de gestion scolaire';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=== Création d\'un nouvel utilisateur ===');

        // Collecter les informations
        $name = $this->option('name') ?: $this->ask('Nom complet de l\'utilisateur');
        $username = $this->option('username') ?: $this->ask('Nom d\'utilisateur (login)');
        $email = $this->option('email') ?: $this->ask('Adresse email');
        
        // Choisir le rôle
        $role = $this->option('role');
        if (!$role) {
            $role = $this->choice('Rôle de l\'utilisateur', [
                'admin' => 'Administrateur',
                'surveillant_general' => 'Surveillant Général',
                'general_accountant' => 'Comptable Général',
                'comptable_superieur' => 'Comptable Supérieur',
                'teacher' => 'Enseignant',
                'accountant' => 'Comptable',
                'user' => 'Utilisateur standard'
            ], 'user');
        }

        // Mot de passe
        $password = $this->option('password');
        if (!$password) {
            $password = $this->secret('Mot de passe (minimum 6 caractères)');
            $confirmPassword = $this->secret('Confirmer le mot de passe');
            
            if ($password !== $confirmPassword) {
                $this->error('Les mots de passe ne correspondent pas !');
                return 1;
            }
        }

        // Validation
        $validator = Validator::make([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => $password,
            'role' => $role,
        ], [
            'name' => 'required|string|between:2,100',
            'username' => 'required|string|between:3,100|unique:users',
            'email' => 'required|string|email|max:100|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:admin,teacher,accountant,user,surveillant_general,general_accountant,comptable_superieur',
        ]);

        if ($validator->fails()) {
            $this->error('Erreurs de validation :');
            foreach ($validator->errors()->all() as $error) {
                $this->line('• ' . $error);
            }
            return 1;
        }

        try {
            // Créer l'utilisateur
            $user = User::create([
                'name' => $name,
                'username' => $username,
                'email' => $email,
                'password' => Hash::make($password),
                'role' => $role,
            ]);

            $this->info('✅ Utilisateur créé avec succès !');
            
            // Afficher le résumé
            $this->table(['Champ', 'Valeur'], [
                ['ID', $user->id],
                ['Nom', $user->name],
                ['Username', $user->username],
                ['Email', $user->email],
                ['Rôle', $this->getRoleLabel($user->role)],
                ['Créé le', $user->created_at->format('d/m/Y H:i:s')],
            ]);

            $this->info('L\'utilisateur peut maintenant se connecter avec :');
            $this->line('• Username: ' . $user->username);
            $this->line('• Password: [le mot de passe saisi]');

            return 0;

        } catch (\Exception $e) {
            $this->error('Erreur lors de la création de l\'utilisateur : ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Obtenir le libellé du rôle
     */
    private function getRoleLabel($role)
    {
        $roles = [
            'admin' => 'Administrateur',
            'surveillant_general' => 'Surveillant Général',
            'general_accountant' => 'Comptable Général',
            'comptable_superieur' => 'Comptable Supérieur',
            'teacher' => 'Enseignant',
            'accountant' => 'Comptable',
            'user' => 'Utilisateur standard'
        ];

        return $roles[$role] ?? $role;
    }
}