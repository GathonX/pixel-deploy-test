<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@pixel-rise.com'], // email unique
            [
                'name'               => 'Admin',
                'password'           => Hash::make('AdminPixel123!'), 
                'email_verified_at'  => now(),
                'is_admin'           => true,
            ]
        );
    }
}
