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

class AttendanceSeeder extends Seeder
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
        $students = Student::with('classSeries')->where('is_active', true)->take(20)->get();
        if ($students->isEmpty()) {
            $this->command->error('Aucun étudiant actif trouvé');
            return;
        }

        $this->command->info('Génération des données d\'attendance...');

        // Générer des données pour les 7 derniers jours
        for ($day = 6; $day >= 0; $day--) {
            $date = Carbon::now()->subDays($day);
            $this->command->info("Génération pour le " . $date->format('d/m/Y'));

            foreach ($students as $student) {
                // Obtenir un surveillant assigné à la classe de l'étudiant
                $supervisor = $this->getSupervisorForStudent($student, $supervisors, $currentSchoolYear);
                
                if (!$supervisor) {
                    continue;
                }

                // Vérifier si l'étudiant a déjà un enregistrement aujourd'hui
                $existingAttendance = Attendance::where('student_id', $student->id)
                    ->where('attendance_date', $date->toDateString())
                    ->first();

                // Si pas d'enregistrement existant, 85% de chance que l'étudiant vienne
                if (!$existingAttendance && rand(1, 100) <= 85) {
                    // Générer l'entrée (entre 7h et 8h30)
                    $entryTime = $date->copy()->setTime(7, 0)->addMinutes(rand(0, 90));
                    
                    $entryAttendance = Attendance::create([
                        'student_id' => $student->id,
                        'supervisor_id' => $supervisor->id,
                        'school_class_id' => $student->classSeries->class_id,
                        'school_year_id' => $currentSchoolYear->id,
                        'attendance_date' => $date->toDateString(),
                        'scanned_at' => $entryTime,
                        'is_present' => true,
                        'event_type' => 'entry',
                        'parent_notified' => rand(1, 100) <= 90, // 90% de notifications réussies
                        'notified_at' => rand(1, 100) <= 90 ? $entryTime->addMinutes(2) : null,
                    ]);
                }
            }
        }

        // Générer quelques données pour aujourd'hui avec des heures récentes
        $today = Carbon::today();
        $this->command->info("Génération pour aujourd'hui " . $today->format('d/m/Y'));

        foreach ($students->take(10) as $student) {
            $supervisor = $this->getSupervisorForStudent($student, $supervisors, $currentSchoolYear);
            
            if (!$supervisor) {
                continue;
            }

            // Entrée ce matin
            if (rand(1, 100) <= 90) {
                $entryTime = $today->copy()->setTime(7, 30)->addMinutes(rand(-30, 60));
                
                Attendance::create([
                    'student_id' => $student->id,
                    'supervisor_id' => $supervisor->id,
                    'school_class_id' => $student->classSeries->class_id,
                    'school_year_id' => $currentSchoolYear->id,
                    'attendance_date' => $today->toDateString(),
                    'scanned_at' => $entryTime,
                    'is_present' => true,
                    'event_type' => 'entry',
                    'parent_notified' => true,
                    'notified_at' => $entryTime->addMinutes(2),
                ]);

                // Quelques sorties pour les étudiants qui sont déjà partis
                if (rand(1, 100) <= 40 && Carbon::now()->hour >= 12) {
                    $exitTime = $today->copy()->setTime(12, 0)->addMinutes(rand(0, 180));
                    
                    Attendance::create([
                        'student_id' => $student->id,
                        'supervisor_id' => $supervisor->id,
                        'school_class_id' => $student->classSeries->class_id,
                        'school_year_id' => $currentSchoolYear->id,
                        'attendance_date' => $today->toDateString(),
                        'scanned_at' => $exitTime,
                        'is_present' => true,
                        'event_type' => 'exit',
                        'parent_notified' => true,
                        'notified_at' => $exitTime->addMinutes(2),
                    ]);
                }
            }
        }

        $totalAttendances = Attendance::count();
        $this->command->info("✅ Seeder terminé ! {$totalAttendances} enregistrements d'attendance créés");
        
        // Statistiques
        $entries = Attendance::where('event_type', 'entry')->count();
        $exits = Attendance::where('event_type', 'exit')->count();
        $notified = Attendance::where('parent_notified', true)->count();
        
        $this->command->table(
            ['Type', 'Nombre'],
            [
                ['Entrées', $entries],
                ['Sorties', $exits],
                ['Notifications envoyées', $notified],
                ['Total', $totalAttendances]
            ]
        );
    }

    /**
     * Obtenir un surveillant assigné à la classe de l'étudiant
     */
    private function getSupervisorForStudent($student, $supervisors, $currentSchoolYear)
    {
        if (!$student->classSeries) {
            return null;
        }

        // Chercher un surveillant assigné à cette classe
        $assignment = SupervisorClassAssignment::where('school_class_id', $student->classSeries->class_id)
            ->where('school_year_id', $currentSchoolYear->id)
            ->where('is_active', true)
            ->with('supervisor')
            ->first();

        if ($assignment && $assignment->supervisor) {
            return $assignment->supervisor;
        }

        // Si aucun surveillant assigné, prendre le premier disponible
        return $supervisors->first();
    }
}