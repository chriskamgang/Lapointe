<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CreateComptableSuperieur extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'create:comptable-superieur {name} {username} {email} {--password=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Créer un utilisateur avec le rôle Comptable Supérieur';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🏢 === Création d\'un Comptable Supérieur ===');
        $this->line('');

        // Récupérer les arguments
        $name = $this->argument('name');
        $username = $this->argument('username');
        $email = $this->argument('email');
        
        // Générer ou demander le mot de passe
        $password = $this->option('password');
        if (!$password) {
            $password = Str::random(12); // Génération automatique
            $this->info('💡 Mot de passe généré automatiquement');
        }

        // Validation des données
        $validator = Validator::make([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => $password,
        ], [
            'name' => 'required|string|between:2,100',
            'username' => 'required|string|between:3,100|unique:users',
            'email' => 'required|string|email|max:100|unique:users',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            $this->error('❌ Erreurs de validation :');
            foreach ($validator->errors()->all() as $error) {
                $this->line('  • ' . $error);
            }
            return 1;
        }

        try {
            // Créer l'utilisateur avec le rôle comptable_superieur
            $user = User::create([
                'name' => $name,
                'username' => $username,
                'email' => $email,
                'password' => Hash::make($password),
                'role' => 'comptable_superieur',
                'is_active' => true,
            ]);

            $this->line('');
            $this->info('✅ Comptable Supérieur créé avec succès !');
            $this->line('');

            // Afficher le résumé
            $this->table(['Champ', 'Valeur'], [
                ['ID', $user->id],
                ['Nom complet', $user->name],
                ['Nom d\'utilisateur', $user->username],
                ['Email', $user->email],
                ['Rôle', 'Comptable Supérieur'],
                ['Statut', 'Actif'],
                ['Créé le', $user->created_at->format('d/m/Y à H:i:s')],
            ]);

            $this->line('');
            $this->info('🔑 Informations de connexion :');
            $this->line('   Username: ' . $user->username);
            $this->line('   Password: ' . $password);
            $this->line('');
            
            $this->info('📋 Accès autorisés pour ce rôle :');
            $this->line('   • Accès en lecture aux classes et étudiants');
            $this->line('   • Enregistrement des paiements');
            $this->line('   • Génération de reçus');
            $this->line('   • Consultation des historiques');
            $this->line('   • Statistiques comptables');
            $this->line('   • Inventaire (gestion complète)');
            $this->line('   • Documents (consultation)');
            $this->line('   • Gestion des besoins (approuver/rejeter)');
            $this->line('   • Statistiques des besoins');
            $this->line('');

            $this->comment('💡 Conseil : Notez bien le mot de passe car il ne sera plus affiché.');
            
            return 0;

        } catch (\Exception $e) {
            $this->error('❌ Erreur lors de la création du Comptable Supérieur : ' . $e->getMessage());
            return 1;
        }
    }
}