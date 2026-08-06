<?php

namespace Database\Seeders;

use App\Infrastructure\Auth\Persistence\Models\EloquentUser;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        EloquentUser::factory()->create([
            'username' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
