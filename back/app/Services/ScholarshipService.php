<?php

namespace App\Services;

use App\Models\UniversityScholarship;
use App\Models\Student;
use App\Models\School;

class ScholarshipService
{
    /**
     * Calculer la bourse d'un étudiant selon l'école et le niveau
     */
    public function calculateScholarship(Student $student)
    {
        $school = $student->classSeries->schoolClass->level->school;
        $level = $student->classSeries->schoolClass->level;
        
        // Récupérer la bourse pour cette école et ce niveau
        $scholarship = UniversityScholarship::active()
            ->where('school_id', $school->id)
            ->where('level_type', $level->level_type)
            ->first();

        if (!$scholarship) {
            return [
                'amount' => 0,
                'laptop_eligible' => false,
                'conditions' => null,
                'eligible' => false
            ];
        }

        // Logique spécifique par école
        $eligibleAmount = $this->calculateScholarshipBySchool(
            $school, 
            $scholarship, 
            $student
        );

        return [
            'amount' => $eligibleAmount,
            'laptop_eligible' => $eligibleAmount > 0 ? $scholarship->laptop_included : false,
            'conditions' => $scholarship->conditions,
            'eligible' => $eligibleAmount > 0,
            'scholarship_id' => $scholarship->id
        ];
    }

    /**
     * Calculer la bourse selon l'école spécifique
     */
    private function calculateScholarshipBySchool(School $school, UniversityScholarship $scholarship, Student $student)
    {
        switch ($school->code) {
            case 'INSSAS':
                // INSSAS : 150k FCFA pour toutes les formations santé
                return $this->calculateINSSASScholarship($scholarship, $student);
                
            case 'ESGIT':
                // ESGIT : selon mention BTS
                return $this->calculateESGITScholarship($scholarship, $student);
                
            case 'ISTPM':
                // ISTPM : 25k FCFA pour toutes les formations
                return $this->calculateISTPMScholarship($scholarship, $student);
                
            case 'ESJEC':
            case 'ESSIT':
            case 'ISTMS':
                // Autres écoles : montant standard si défini
                return $scholarship->scholarship_amount;
                
            default:
                return 0;
        }
    }

    /**
     * Calculer bourse INSSAS (150k FCFA)
     */
    private function calculateINSSASScholarship(UniversityScholarship $scholarship, Student $student)
    {
        $levelType = $student->classSeries->schoolClass->level->level_type;
        $currentLevel = $student->current_level ?: 1;

        if (in_array($levelType, ['BTS', 'HND', 'DOUBLE_DIPLOMATION'])) {
            if ($currentLevel == 1) {
                return $scholarship->level_1_amount;
            } else {
                return $scholarship->level_2_plus_amount;
            }
        }
        
        if ($levelType === 'MASTER' || $levelType === 'PROFESSIONAL_MASTER') {
            if ($currentLevel > 2) {
                return 0;
            }
        }

        // For all other cases (Licence Pro, Bachelor, and Master 1/2), return the main amount.
        return $scholarship->scholarship_amount;
    }

    /**
     * Calculer bourse ESGIT (selon mention BTS)
     */
    private function calculateESGITScholarship(UniversityScholarship $scholarship, Student $student)
    {
        $levelType = $student->classSeries->schoolClass->level->level_type;
        
        // Bourses ESGIT uniquement pour licence pro avec mention BTS
        if ($levelType === 'LICENCE_PRO' && $student->bts_mention) {
            switch (strtoupper($student->bts_mention)) {
                case 'TRES_BIEN':
                case 'TRÈS BIEN':
                    return 150000; // 150k FCFA pour mention Très Bien
                case 'BIEN':
                    return 100000; // 100k FCFA pour mention Bien
                case 'ASSEZ_BIEN':
                case 'ASSEZ BIEN':
                    return 50000;  // 50k FCFA pour mention Assez Bien
                default:
                    return 0;
            }
        }
        
        return 0;
    }

    /**
     * Calculer bourse ISTPM (25k FCFA)
     */
    private function calculateISTPMScholarship(UniversityScholarship $scholarship, Student $student)
    {
        // ISTPM offre 25k FCFA pour toutes les formations CQP et DQP
        $istpmLevels = ['CQP', 'DQP'];
        
        $levelType = $student->classSeries->schoolClass->level->level_type;
        
        if (in_array($levelType, $istpmLevels)) {
            return 25000; // 25k FCFA
        }
        
        return 0;
    }

    /**
     * Appliquer automatiquement la bourse à un étudiant
     */
    public function applyScholarshipToStudent(Student $student)
    {
        $scholarshipData = $this->calculateScholarship($student);
        
        if ($scholarshipData['eligible']) {
            $student->scholarship_amount = $scholarshipData['amount'];
            $student->laptop_eligible = $scholarshipData['laptop_eligible'];
            $student->save();
            
            return [
                'success' => true,
                'message' => "Bourse de {$scholarshipData['amount']} FCFA appliquée avec succès",
                'data' => $scholarshipData
            ];
        }
        
        return [
            'success' => false,
            'message' => 'Étudiant non éligible aux bourses',
            'data' => $scholarshipData
        ];
    }

    /**
     * Mettre à jour les bourses pour tous les étudiants d'une école
     */
    public function updateScholarshipsForSchool($schoolId)
    {
        $school = School::findOrFail($schoolId);
        
        // Récupérer tous les étudiants de cette école
        $students = Student::whereHas('classSeries.schoolClass.level.school', function($query) use ($schoolId) {
            $query->where('id', $schoolId);
        })->get();
        
        $updated = 0;
        $errors = [];
        
        foreach ($students as $student) {
            try {
                $result = $this->applyScholarshipToStudent($student);
                if ($result['success']) {
                    $updated++;
                }
            } catch (\Exception $e) {
                $errors[] = "Étudiant {$student->id}: " . $e->getMessage();
            }
        }
        
        return [
            'school' => $school->name,
            'total_students' => $students->count(),
            'updated' => $updated,
            'errors' => $errors
        ];
    }
}