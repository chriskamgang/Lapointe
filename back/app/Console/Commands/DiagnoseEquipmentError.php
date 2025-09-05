<?php
// Créer cette commande avec: php artisan make:command DiagnoseEquipmentError

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Student;
use App\Models\SchoolYear;

class DiagnoseEquipmentError extends Command
{
    protected $signature = 'equipment:diagnose {student_id}';
    protected $description = 'Diagnostiquer les problèmes d\'équipement pour un étudiant spécifique';

    public function handle()
    {
        $studentId = $this->argument('student_id');
        
        $this->info("=== DIAGNOSTIC ÉQUIPEMENT - ÉTUDIANT #{$studentId} ===");
        
        // 1. Vérifier l'étudiant
        $student = Student::find($studentId);
        if (!$student) {
            $this->error("❌ Étudiant #{$studentId} non trouvé");
            return;
        }
        $this->info("✅ Étudiant trouvé: {$student->name}");
        
        // 2. Vérifier les relations
        $this->info("\n--- Vérification des relations ---");
        
        $student->load(['classSeries.schoolClass.level.school']);
        
        if (!$student->classSeries) {
            $this->error("❌ Pas de série de classe associée");
            return;
        }
        $this->info("✅ Série: {$student->classSeries->name}");
        
        if (!$student->classSeries->schoolClass) {
            $this->error("❌ Pas de classe associée à la série");
            return;
        }
        $this->info("✅ Classe: {$student->classSeries->schoolClass->name}");
        
        if (!$student->classSeries->schoolClass->level) {
            $this->error("❌ Pas de niveau associé à la classe");
            return;
        }
        $this->info("✅ Niveau: {$student->classSeries->schoolClass->level->name}");
        
        if (!$student->classSeries->schoolClass->level->school) {
            $this->error("❌ Pas d'école associée au niveau");
            return;
        }
        $this->info("✅ École: {$student->classSeries->schoolClass->level->school->name} ({$student->classSeries->schoolClass->level->school->code})");
        
        // 3. Vérifier les années scolaires
        $this->info("\n--- Vérification des années scolaires ---");
        
        $workingYear = SchoolYear::where('is_working_year', true)->first();
        if ($workingYear) {
            $this->info("✅ Année de travail: {$workingYear->name}");
        } else {
            $this->warn("⚠️ Aucune année avec is_working_year = true");
        }
        
        $currentYear = SchoolYear::where('is_current', true)->first();
        if ($currentYear) {
            $this->info("✅ Année courante: {$currentYear->name}");
        } else {
            $this->warn("⚠️ Aucune année avec is_current = true");
        }
        
        $activeYears = SchoolYear::where('is_active', true)->count();
        $this->info("📊 Années actives: {$activeYears}");
        
        // 4. Test de la méthode getRequiredEquipmentForClass
        $this->info("\n--- Test des équipements requis ---");
        
        try {
            $schoolCode = $student->classSeries->schoolClass->level->school->code;
            $className = $student->classSeries->schoolClass->name;
            $levelType = $student->classSeries->schoolClass->level->level_type;
            
            $this->info("École: {$schoolCode}");
            $this->info("Classe: {$className}");
            $this->info("Type niveau: {$levelType}");
            
            // Simuler la logique getRequiredEquipmentForClass
            $equipment = [
                'polo' => false,
                'blouse' => false,
                'laptop' => false,
                'rame' => true
            ];

            if ($schoolCode === 'ISTMS') {
                $equipment['rame'] = false;
                $equipment['blouse'] = true;
            } elseif ($schoolCode === 'INSSAS') {
                $equipment['blouse'] = true;
                $equipment['laptop'] = in_array($levelType, ['LICENCE_ACA', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO']);
            } elseif ($schoolCode === 'ESGIT') {
                $equipment['polo'] = true;
                $equipment['laptop'] = true;
            } elseif ($schoolCode === 'ESJEC') {
                $equipment['polo'] = true;
                $equipment['laptop'] = ($levelType === 'BTS');
            } elseif ($schoolCode === 'ESSIT') {
                $equipment['polo'] = true;
                $equipment['laptop'] = true;
            } elseif ($schoolCode === 'ISTPM') {
                $healthSpecialties = ['Aide-soignant', 'Auxiliaire', 'Technicien', 'Assistant Médical'];
                $isHealth = false;
                foreach ($healthSpecialties as $specialty) {
                    if (stripos($className, $specialty) !== false) {
                        $isHealth = true;
                        break;
                    }
                }
                $equipment['blouse'] = $isHealth;
                $equipment['polo'] = !$isHealth;
            } else {
                $equipment['polo'] = true;
            }
            
            $this->info("Équipements requis:");
            foreach ($equipment as $type => $required) {
                if ($required) {
                    $this->info("  ✅ {$type}");
                } else {
                    $this->line("  ⬜ {$type}");
                }
            }
            
        } catch (\Exception $e) {
            $this->error("❌ Erreur lors du calcul des équipements: " . $e->getMessage());
        }
        
        $this->info("\n=== FIN DU DIAGNOSTIC ===");
    }
}