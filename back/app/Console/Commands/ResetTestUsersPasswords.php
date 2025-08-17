<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class ResetTestUsersPasswords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:reset-test-passwords';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset passwords for test users created by seeders';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Réinitialisation des mots de passe des utilisateurs de test...');
        
        $testUsers = [
            'admin' => 'Administrateur',
            'comptable' => 'Comptable Dupont', 
            'prof.martin' => 'Professeur Martin',
            'prof.dubois' => 'Professeur Dubois',
            'prof.ngomo' => 'Professeur Ngomo',
            'user.test' => 'Utilisateur Test'
        ];
        
        $resetCount = 0;
        
        foreach ($testUsers as $username => $name) {
            $user = User::where('username', $username)->first();
            
            if ($user) {
                $user->update([
                    'password' => Hash::make('password123')
                ]);
                $resetCount++;
                $this->line("✅ Mot de passe réinitialisé pour: {$name} ({$username})");
            } else {
                $this->warn("⚠️  Utilisateur non trouvé: {$username}");
            }
        }
        
        $this->info("\n🎉 {$resetCount} mots de passe réinitialisés avec succès !");
        $this->info("📝 Mot de passe par défaut: password123");
        
        return Command::SUCCESS;
    }
}