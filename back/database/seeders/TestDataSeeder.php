<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\SchoolClass;
use App\Models\SeriesSubject;
use App\Models\SchoolYear;

class TestDataSeeder extends Seeder
{
    public function run()
    {
        // Créer un utilisateur admin de test
        $admin = User::firstOrCreate(
            ['email' => 'admin@test.com'],
            [
                'name' => 'Admin Test',
                'username' => 'admin',
                'password' => bcrypt('password'),
                'role' => 'admin'
            ]
        );

        // Créer quelques matières de test
        $subjects = [
            ['name' => 'Mathématiques', 'code' => 'MATH', 'description' => 'Mathématiques générales'],
            ['name' => 'Français', 'code' => 'FR', 'description' => 'Langue française'],
            ['name' => 'Anglais', 'code' => 'EN', 'description' => 'Langue anglaise'],
            ['name' => 'Sciences', 'code' => 'SCI', 'description' => 'Sciences naturelles'],
            ['name' => 'Histoire-Géographie', 'code' => 'HG', 'description' => 'Histoire et géographie'],
        ];

        foreach ($subjects as $subjectData) {
            Subject::firstOrCreate(
                ['code' => $subjectData['code']],
                array_merge($subjectData, ['is_active' => true])
            );
        }

        // Créer quelques enseignants de test
        $teachers = [
            [
                'first_name' => 'Jean',
                'last_name' => 'Dupont',
                'phone_number' => '+237650123456',
                'email' => 'jean.dupont@school.com',
                'specialization' => 'Mathématiques'
            ],
            [
                'first_name' => 'Marie',
                'last_name' => 'Martin',
                'phone_number' => '+237650654321',
                'email' => 'marie.martin@school.com',
                'specialization' => 'Français'
            ],
            [
                'first_name' => 'Paul',
                'last_name' => 'Bernard',
                'phone_number' => '+237650789456',
                'email' => 'paul.bernard@school.com',
                'specialization' => 'Sciences'
            ]
        ];

        foreach ($teachers as $teacherData) {
            // Créer un compte utilisateur pour l'enseignant
            $user = User::firstOrCreate(
                ['email' => $teacherData['email']],
                [
                    'name' => $teacherData['first_name'] . ' ' . $teacherData['last_name'],
                    'username' => strtolower($teacherData['first_name'] . '.' . $teacherData['last_name']),
                    'password' => bcrypt('password'),
                    'role' => 'teacher'
                ]
            );

            // Créer l'enseignant
            Teacher::firstOrCreate(
                ['email' => $teacherData['email']],
                array_merge($teacherData, [
                    'user_id' => $user->id,
                    'is_active' => true
                ])
            );
        }

        // Créer une année scolaire courante si elle n'existe pas
        $currentYear = SchoolYear::where('is_current', true)->first();
        if (!$currentYear) {
            SchoolYear::create([
                'name' => '2024-2025',
                'start_date' => '2024-09-01',
                'end_date' => '2025-07-31',
                'is_current' => true,
                'is_active' => true
            ]);
        }

        // Créer quelques configurations série-matières
        $schoolClasses = SchoolClass::take(3)->get();
        $allSubjects = Subject::take(3)->get();

        foreach ($schoolClasses as $schoolClass) {
            foreach ($allSubjects as $subject) {
                SeriesSubject::firstOrCreate(
                    [
                        'school_class_id' => $schoolClass->id,
                        'subject_id' => $subject->id
                    ],
                    [
                        'coefficient' => rand(1, 3) + 0.5,
                        'is_active' => true
                    ]
                );
            }
        }

        $this->command->info('Test data created successfully!');
    }
}