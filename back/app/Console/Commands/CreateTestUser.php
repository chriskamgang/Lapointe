<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class CreateTestUser extends Command
{
    protected $signature = 'user:create-test';
    protected $description = 'Create a test admin user';

    public function handle()
    {
        $user = User::where('username', 'admin')->first();
        
        if ($user) {
            $this->info('Admin user already exists');
            $this->info('Username: ' . $user->username);
            $this->info('Email: ' . $user->email);
            $this->info('Role: ' . $user->role);
            return;
        }

        $user = User::create([
            'name' => 'Admin Test',
            'username' => 'admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin'
        ]);

        $this->info('Admin user created successfully!');
        $this->info('Username: admin');
        $this->info('Password: password');
        $this->info('Email: admin@test.com');
    }
}