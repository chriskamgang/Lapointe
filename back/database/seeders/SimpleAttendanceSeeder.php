<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Attendance;
use App\Models\Student;
use App\Models\User;
use App\Models\SchoolYear;
use App\Models\SupervisorClassAssignment;
use Carbon\Carbon;

class SimpleAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtenir l'année scolaire active
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        if (!$currentSchoolYear) {
            $this->command->error('Aucune année scolaire active trouvée');
            return;
        }

        // Obtenir les surveillants généraux
        $supervisors = User::where('role', 'surveillant_general')->get();
        if ($supervisors->isEmpty()) {
            $this->command->error('Aucun surveillant général trouvé');
            return;
        }

        // Obtenir les étudiants actifs avec leurs classes
        $students = Student::with('classSeries')->where('is_active', true)->take(15)->get();
        if ($students->isEmpty()) {
            $this->command->error('Aucun étudiant actif trouvé');
            return;
        }

        $this->command->info('Génération des données d\'attendance...');

        $attendances = [];
        
        // Générer des données pour aujourd'hui - entrées seulement
        $today = Carbon::today();
        $this->command->info("Génération pour aujourd'hui " . $today->format('d/m/Y'));

        foreach ($students as $index => $student) {
            $supervisor = $supervisors->first();
            
            if (!$student->classSeries) {
                continue;
            }

            // Entrée ce matin (entre 7h et 8h30)
            $entryTime = $today->copy()->setTime(7, 0)->addMinutes(rand(0, 90));
            
            $attendances[] = [
                'student_id' => $student->id,
                'supervisor_id' => $supervisor->id,
                'school_class_id' => $student->classSeries->class_id,
                'school_year_id' => $currentSchoolYear->id,
                'attendance_date' => $today->toDateString(),
                'scanned_at' => $entryTime->format('H:i:s'),
                'is_present' => true,
                'event_type' => 'entry',
                'parent_notified' => true,
                'notified_at' => $entryTime->addMinutes(2),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Pour quelques étudiants, ajouter aussi une sortie
            if ($index < 5 && Carbon::now()->hour >= 12) {
                $exitTime = $today->copy()->setTime(15, 0)->addMinutes(rand(0, 120));
                
                $attendances[] = [
                    'student_id' => $student->id,
                    'supervisor_id' => $supervisor->id,
                    'school_class_id' => $student->classSeries->class_id,
                    'school_year_id' => $currentSchoolYear->id,
                    'attendance_date' => $today->toDateString(),
                    'scanned_at' => $exitTime->format('H:i:s'),
                    'is_present' => true,
                    'event_type' => 'exit',
                    'parent_notified' => true,
                    'notified_at' => $exitTime->addMinutes(2),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // Générer aussi quelques données pour hier
        $yesterday = Carbon::yesterday();
        $this->command->info("Génération pour hier " . $yesterday->format('d/m/Y'));

        foreach ($students->take(10) as $index => $student) {
            $supervisor = $supervisors->first();
            
            if (!$student->classSeries) {
                continue;
            }

            // Entrée hier matin
            $entryTime = $yesterday->copy()->setTime(7, 30)->addMinutes(rand(-30, 60));
            
            $attendances[] = [
                'student_id' => $student->id,
                'supervisor_id' => $supervisor->id,
                'school_class_id' => $student->classSeries->class_id,
                'school_year_id' => $currentSchoolYear->id,
                'attendance_date' => $yesterday->toDateString(),
                'scanned_at' => $entryTime->format('H:i:s'),
                'is_present' => true,
                'event_type' => 'entry',
                'parent_notified' => true,
                'notified_at' => $entryTime->addMinutes(2),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Sortie hier après-midi pour tous
            $exitTime = $yesterday->copy()->setTime(16, 0)->addMinutes(rand(-30, 60));
            
            $attendances[] = [
                'student_id' => $student->id,
                'supervisor_id' => $supervisor->id,
                'school_class_id' => $student->classSeries->class_id,
                'school_year_id' => $currentSchoolYear->id,
                'attendance_date' => $yesterday->toDateString(),
                'scanned_at' => $exitTime->format('H:i:s'),
                'is_present' => true,
                'event_type' => 'exit',
                'parent_notified' => true,
                'notified_at' => $exitTime->addMinutes(2),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Insérer les enregistrements un par un pour éviter les conflits
        foreach($attendances as $attendance) {
            try {
                \DB::table('attendances')->insert($attendance);
            } catch (\Exception $e) {
                $this->command->warn("Conflit ignoré pour étudiant {$attendance['student_id']} à {$attendance['attendance_date']}");
            }
        }

        $totalAttendances = Attendance::count();
        $this->command->info("✅ Seeder terminé ! {$totalAttendances} enregistrements d'attendance créés");
        
        // Statistiques
        $entries = Attendance::where('event_type', 'entry')->count();
        $exits = Attendance::where('event_type', 'exit')->count();
        $notified = Attendance::where('parent_notified', true)->count();
        $todayCount = Attendance::whereDate('attendance_date', today())->count();
        
        $this->command->table(
            ['Type', 'Nombre'],
            [
                ['Entrées', $entries],
                ['Sorties', $exits],
                ['Notifications envoyées', $notified],
                ['Aujourd\'hui', $todayCount],
                ['Total', $totalAttendances]
            ]
        );
    }
}