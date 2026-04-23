<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'user@pixel-rise.com'], // email unique
            [
                'name'               => 'User',
                'password'           => Hash::make('UserPixel123!'), 
                'email_verified_at'  => now(),
            ]
            
        );

        User::updateOrCreate(
            [
            'name' => 'Jean Dupont',
            'email' => 'jean@example.com',
            'password' => bcrypt('password123'),
             'email_verified_at'  => now(),
        ]
    );
    }
}
