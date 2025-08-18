<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\UniversityScholarship;
use App\Models\School;
use App\Models\Level;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ScholarshipAutomationController extends Controller
{
    /**
     * Calculer et assigner automatiquement toutes les bourses
     */
    public function calculateAllScholarships(Request $request)
    {
        try {
            DB::beginTransaction();

            $updated = 0;
            $errors = [];
            
            $students = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true)
                ->get();

            foreach ($students as $student) {
                try {
                    $result = $this->calculateScholarshipForStudent($student);
                    if ($result['updated']) {
                        $updated++;
                    }
                } catch (\Exception $e) {
                    $errors[] = "Étudiant {$student->id}: " . $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Calcul terminé: {$updated} étudiant(s) mis à jour",
                'updated_count' => $updated,
                'total_students' => $students->count(),
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul automatique des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Assigner l'éligibilité aux ordinateurs selon les règles
     */
    public function assignLaptopsEligibility(Request $request)
    {
        try {
            DB::beginTransaction();

            $updated = 0;
            $students = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true)
                ->get();

            foreach ($students as $student) {
                $laptopEligible = $this->determineLaptopEligibility($student);
                
                if ($student->laptop_eligible !== $laptopEligible) {
                    $student->update(['laptop_eligible' => $laptopEligible]);
                    $updated++;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Éligibilité ordinateurs mise à jour pour {$updated} étudiant(s)",
                'updated_count' => $updated,
                'total_students' => $students->count()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'éligibilité ordinateurs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour les bourses selon la mention BTS
     */
    public function updateByMention(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'nullable|exists:schools,id',
            'level_type' => 'nullable|string',
            'force_update' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $query = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true)
                ->whereNotNull('bts_mention');

            // Appliquer les filtres
            if ($request->school_id) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            if ($request->level_type) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('level_type', $request->level_type);
                });
            }

            $students = $query->get();
            $updated = 0;

            foreach ($students as $student) {
                $result = $this->calculateScholarshipByMention($student, $request->force_update ?? false);
                if ($result['updated']) {
                    $updated++;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Bourses mises à jour selon les mentions pour {$updated} étudiant(s)",
                'updated_count' => $updated,
                'total_students' => $students->count()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour par mention',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les règles d'éligibilité
     */
    public function getEligibilityRules()
    {
        try {
            $rules = [
                'scholarship_rules' => [
                    'INSSAS' => [
                        'all_levels' => [
                            'base_amount' => 50000,
                            'laptop_included' => true,
                            'conditions' => 'Inscription régulière dans une formation santé'
                        ]
                    ],
                    'ESGIT' => [
                        'BTS' => [
                            'laptop_included' => true,
                            'base_amount' => 0,
                            'mention_bonuses' => [
                                'Très Bien' => ['amount' => 150000, 'laptop' => true],
                                'Bien' => ['amount' => 120000, 'laptop' => false],
                                'Assez Bien' => ['amount' => 100000, 'laptop' => false],
                                'Passable' => ['amount' => 50000, 'laptop' => false]
                            ]
                        ],
                        'LICENCE_PRO' => [
                            'base_amount' => 100000,
                            'laptop_included' => false,
                            'conditions' => 'BTS validé avec mention'
                        ],
                        'MASTER' => [
                            'base_amount' => 100000,
                            'laptop_included' => false,
                            'conditions' => 'Licence Pro validée'
                        ],
                        'INGENIERIE' => [
                            'base_amount' => 50000,
                            'laptop_included' => false,
                            'conditions' => 'Admission en cycle ingénierie'
                        ]
                    ],
                    'ISTPM' => [
                        'CQP' => [
                            'base_amount' => 25000,
                            'laptop_included' => false,
                            'conditions' => 'Inscription en CQP'
                        ],
                        'DQP' => [
                            'base_amount' => 25000,
                            'laptop_included' => false,
                            'conditions' => 'Inscription en DQP'
                        ]
                    ],
                    'DEFAULT' => [
                        'all_levels' => [
                            'base_amount' => 0,
                            'laptop_included' => true,
                            'conditions' => 'Selon les disponibilités budgétaires'
                        ]
                    ]
                ],
                'laptop_eligibility_rules' => [
                    'INSSAS' => 'Tous les étudiants inscrits',
                    'ESGIT' => 'Tous les BTS + Licence Pro mention Très Bien',
                    'ESJEC' => 'Tous les BTS',
                    'ESSIT' => 'Tous les BTS',
                    'ISTPM' => 'Aucun ordinateur distribué',
                    'ISTMS' => 'Aucun ordinateur distribué'
                ],
                'special_conditions' => [
                    'laptop_distribution_timing' => 'Après paiement de la 2ème tranche',
                    'scholarship_payment_schedule' => 'Versée en 3 fois avec les tranches de scolarité',
                    'mention_requirements' => 'Mention BTS requise pour ESGIT uniquement',
                    'renewal_conditions' => 'Assiduité aux cours et résultats satisfaisants'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $rules
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des règles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer la bourse pour un étudiant spécifique
     */
    private function calculateScholarshipForStudent(Student $student)
    {
        if (!$student->classSeries || !$student->classSeries->schoolClass) {
            return ['updated' => false, 'reason' => 'Pas de classe assignée'];
        }

        $level = $student->classSeries->schoolClass->level;
        if (!$level || !$level->school) {
            return ['updated' => false, 'reason' => 'Pas d\'école trouvée'];
        }

        $school = $level->school;
        $scholarshipAmount = 0;
        $laptopEligible = false;

        // Appliquer les règles selon l'école et le niveau
        switch ($school->code) {
            case 'INSSAS':
                $scholarshipAmount = 50000;
                $laptopEligible = true;
                break;
            
            case 'ESGIT':
                $laptopEligible = true; // Tous les ESGIT ont droit au laptop
                
                if ($level->level_type === 'BTS' && $student->bts_mention) {
                    switch ($student->bts_mention) {
                        case 'Très Bien':
                            $scholarshipAmount = 150000;
                            break;
                        case 'Bien':
                            $scholarshipAmount = 120000;
                            break;
                        case 'Assez Bien':
                            $scholarshipAmount = 100000;
                            break;
                        case 'Passable':
                            $scholarshipAmount = 50000;
                            break;
                    }
                } elseif ($level->level_type === 'LICENCE_PRO') {
                    $scholarshipAmount = 100000;
                    $laptopEligible = false;
                } elseif ($level->level_type === 'MASTER') {
                    $scholarshipAmount = 100000;
                    $laptopEligible = false;
                } elseif ($level->level_type === 'INGENIERIE') {
                    $scholarshipAmount = 50000;
                    $laptopEligible = false;
                }
                break;
            
            case 'ESJEC':
                $laptopEligible = true;
                break;
            
            case 'ESSIT':
                $laptopEligible = true;
                break;
            
            case 'ISTPM':
                $scholarshipAmount = 25000;
                $laptopEligible = false;
                break;
            
            case 'ISTMS':
                $scholarshipAmount = 0;
                $laptopEligible = false;
                break;
        }

        // Mettre à jour si différent
        $needsUpdate = ($student->scholarship_amount != $scholarshipAmount || 
                       $student->laptop_eligible != $laptopEligible);

        if ($needsUpdate) {
            $student->update([
                'scholarship_amount' => $scholarshipAmount,
                'laptop_eligible' => $laptopEligible
            ]);
        }

        return [
            'updated' => $needsUpdate,
            'scholarship_amount' => $scholarshipAmount,
            'laptop_eligible' => $laptopEligible,
            'school_code' => $school->code,
            'level_type' => $level->level_type
        ];
    }

    /**
     * Déterminer l'éligibilité laptop pour un étudiant
     */
    private function determineLaptopEligibility(Student $student)
    {
        if (!$student->classSeries || !$student->classSeries->schoolClass) {
            return false;
        }

        $level = $student->classSeries->schoolClass->level;
        if (!$level || !$level->school) {
            return false;
        }

        $school = $level->school;

        switch ($school->code) {
            case 'INSSAS':
                return true; // Tous les étudiants INSSAS
            
            case 'ESGIT':
                if ($level->level_type === 'BTS') {
                    return true; // Tous les BTS ESGIT
                }
                if ($level->level_type === 'LICENCE_PRO' && $student->bts_mention === 'Très Bien') {
                    return true; // Licence Pro avec mention Très Bien
                }
                return false;
            
            case 'ESJEC':
            case 'ESSIT':
                return true; // Tous les étudiants de ces écoles
            
            case 'ISTPM':
            case 'ISTMS':
                return false; // Pas d'ordinateur pour ces écoles
            
            default:
                return false;
        }
    }

    /**
     * Calculer la bourse selon la mention BTS
     */
    private function calculateScholarshipByMention(Student $student, $forceUpdate = false)
    {
        if (!$student->bts_mention) {
            return ['updated' => false, 'reason' => 'Pas de mention BTS'];
        }

        if (!$student->classSeries || !$student->classSeries->schoolClass) {
            return ['updated' => false, 'reason' => 'Pas de classe assignée'];
        }

        $level = $student->classSeries->schoolClass->level;
        if (!$level || !$level->school) {
            return ['updated' => false, 'reason' => 'Pas d\'école trouvée'];
        }

        $school = $level->school;
        
        // Seul ESGIT a des bourses selon les mentions
        if ($school->code !== 'ESGIT' || $level->level_type !== 'BTS') {
            return ['updated' => false, 'reason' => 'École/niveau non concerné par les mentions'];
        }

        $newAmount = 0;
        switch ($student->bts_mention) {
            case 'Très Bien':
                $newAmount = 150000;
                break;
            case 'Bien':
                $newAmount = 120000;
                break;
            case 'Assez Bien':
                $newAmount = 100000;
                break;
            case 'Passable':
                $newAmount = 50000;
                break;
        }

        if ($forceUpdate || $student->scholarship_amount != $newAmount) {
            $student->update(['scholarship_amount' => $newAmount]);
            return [
                'updated' => true,
                'old_amount' => $student->scholarship_amount,
                'new_amount' => $newAmount,
                'mention' => $student->bts_mention
            ];
        }

        return ['updated' => false, 'reason' => 'Montant déjà correct'];
    }

    /**
     * Obtenir un rapport détaillé des bourses calculées
     */
    public function getScholarshipReport(Request $request)
    {
        try {
            $query = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true);

            // Filtres optionnels
            if ($request->school_id) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            if ($request->level_type) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('level_type', $request->level_type);
                });
            }

            $students = $query->get();
            
            $report = [
                'summary' => [
                    'total_students' => $students->count(),
                    'students_with_scholarships' => $students->where('scholarship_amount', '>', 0)->count(),
                    'students_with_laptops' => $students->where('laptop_eligible', true)->count(),
                    'total_scholarship_amount' => $students->sum('scholarship_amount'),
                    'average_scholarship' => $students->where('scholarship_amount', '>', 0)->avg('scholarship_amount')
                ],
                'by_school' => [],
                'by_mention' => [],
                'by_level' => []
            ];

            // Grouper par école
            $bySchool = $students->groupBy(function($student) {
                return $student->classSeries->schoolClass->level->school->code ?? 'UNKNOWN';
            });

            foreach ($bySchool as $schoolCode => $schoolStudents) {
                $report['by_school'][$schoolCode] = [
                    'total_students' => $schoolStudents->count(),
                    'students_with_scholarships' => $schoolStudents->where('scholarship_amount', '>', 0)->count(),
                    'students_with_laptops' => $schoolStudents->where('laptop_eligible', true)->count(),
                    'total_amount' => $schoolStudents->sum('scholarship_amount'),
                    'average_amount' => $schoolStudents->where('scholarship_amount', '>', 0)->avg('scholarship_amount')
                ];
            }

            // Grouper par mention BTS
            $byMention = $students->where('bts_mention', '!=', null)->groupBy('bts_mention');
            foreach ($byMention as $mention => $mentionStudents) {
                $report['by_mention'][$mention] = [
                    'total_students' => $mentionStudents->count(),
                    'total_amount' => $mentionStudents->sum('scholarship_amount'),
                    'average_amount' => $mentionStudents->avg('scholarship_amount')
                ];
            }

            // Grouper par niveau
            $byLevel = $students->groupBy(function($student) {
                return $student->classSeries->schoolClass->level->level_type ?? 'UNKNOWN';
            });

            foreach ($byLevel as $levelType => $levelStudents) {
                $report['by_level'][$levelType] = [
                    'total_students' => $levelStudents->count(),
                    'students_with_scholarships' => $levelStudents->where('scholarship_amount', '>', 0)->count(),
                    'students_with_laptops' => $levelStudents->where('laptop_eligible', true)->count(),
                    'total_amount' => $levelStudents->sum('scholarship_amount')
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $report
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Simuler le calcul des bourses sans les sauvegarder
     */
    public function simulateScholarshipCalculation(Request $request)
    {
        try {
            $query = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true);

            if ($request->school_id) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            $students = $query->get();
            $simulation = [];

            foreach ($students as $student) {
                $currentAmount = $student->scholarship_amount;
                $currentLaptop = $student->laptop_eligible;

                $calculation = $this->calculateScholarshipForStudentSimulation($student);
                
                $simulation[] = [
                    'student_id' => $student->id,
                    'student_name' => $student->first_name . ' ' . $student->last_name,
                    'school_code' => $calculation['school_code'],
                    'level_type' => $calculation['level_type'],
                    'bts_mention' => $student->bts_mention,
                    'current_scholarship' => $currentAmount,
                    'proposed_scholarship' => $calculation['scholarship_amount'],
                    'scholarship_change' => $calculation['scholarship_amount'] - $currentAmount,
                    'current_laptop_eligible' => $currentLaptop,
                    'proposed_laptop_eligible' => $calculation['laptop_eligible'],
                    'laptop_change' => $calculation['laptop_eligible'] !== $currentLaptop,
                    'would_update' => $calculation['would_update']
                ];
            }

            $summary = [
                'total_students' => count($simulation),
                'students_to_update' => collect($simulation)->where('would_update', true)->count(),
                'total_current_amount' => collect($simulation)->sum('current_scholarship'),
                'total_proposed_amount' => collect($simulation)->sum('proposed_scholarship'),
                'total_increase' => collect($simulation)->sum('scholarship_change'),
                'laptop_additions' => collect($simulation)->where('laptop_change', true)->where('proposed_laptop_eligible', true)->count(),
                'laptop_removals' => collect($simulation)->where('laptop_change', true)->where('proposed_laptop_eligible', false)->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $summary,
                    'details' => $simulation
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la simulation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer la bourse pour simulation (sans sauvegarder)
     */
    private function calculateScholarshipForStudentSimulation(Student $student)
    {
        if (!$student->classSeries || !$student->classSeries->schoolClass) {
            return [
                'scholarship_amount' => 0,
                'laptop_eligible' => false,
                'school_code' => 'UNKNOWN',
                'level_type' => 'UNKNOWN',
                'would_update' => false
            ];
        }

        $level = $student->classSeries->schoolClass->level;
        if (!$level || !$level->school) {
            return [
                'scholarship_amount' => 0,
                'laptop_eligible' => false,
                'school_code' => 'UNKNOWN',
                'level_type' => 'UNKNOWN',
                'would_update' => false
            ];
        }

        $school = $level->school;
        $scholarshipAmount = 0;
        $laptopEligible = false;

        // Même logique que calculateScholarshipForStudent
        switch ($school->code) {
            case 'INSSAS':
                $scholarshipAmount = 50000;
                $laptopEligible = true;
                break;
            
            case 'ESGIT':
                $laptopEligible = true;
                
                if ($level->level_type === 'BTS' && $student->bts_mention) {
                    switch ($student->bts_mention) {
                        case 'Très Bien':
                            $scholarshipAmount = 150000;
                            break;
                        case 'Bien':
                            $scholarshipAmount = 120000;
                            break;
                        case 'Assez Bien':
                            $scholarshipAmount = 100000;
                            break;
                        case 'Passable':
                            $scholarshipAmount = 50000;
                            break;
                    }
                } elseif ($level->level_type === 'LICENCE_PRO') {
                    $scholarshipAmount = 100000;
                    $laptopEligible = false;
                } elseif ($level->level_type === 'MASTER') {
                    $scholarshipAmount = 100000;
                    $laptopEligible = false;
                } elseif ($level->level_type === 'INGENIERIE') {
                    $scholarshipAmount = 50000;
                    $laptopEligible = false;
                }
                break;
            
            case 'ESJEC':
                $laptopEligible = true;
                break;
            
            case 'ESSIT':
                $laptopEligible = true;
                break;
            
            case 'ISTPM':
                $scholarshipAmount = 25000;
                $laptopEligible = false;
                break;
            
            case 'ISTMS':
                $scholarshipAmount = 0;
                $laptopEligible = false;
                break;
        }

        $wouldUpdate = ($student->scholarship_amount != $scholarshipAmount || 
                       $student->laptop_eligible != $laptopEligible);

        return [
            'scholarship_amount' => $scholarshipAmount,
            'laptop_eligible' => $laptopEligible,
            'school_code' => $school->code,
            'level_type' => $level->level_type,
            'would_update' => $wouldUpdate
        ];
    }

    /**
     * Exporter le rapport des bourses en Excel
     */
    public function exportScholarshipReport(Request $request)
    {
        try {
            // Ici tu peux utiliser Laravel Excel ou une autre solution
            // Pour l'instant, on retourne les données formatées pour l'export
            
            $students = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true)
                ->get();

            $exportData = [];
            foreach ($students as $student) {
                $school = $student->classSeries->schoolClass->level->school ?? null;
                $level = $student->classSeries->schoolClass->level ?? null;
                
                $exportData[] = [
                    'Nom' => $student->last_name,
                    'Prénom' => $student->first_name,
                    'École' => $school ? $school->name : 'N/A',
                    'Code École' => $school ? $school->code : 'N/A',
                    'Niveau' => $level ? $level->level_type : 'N/A',
                    'Mention BTS' => $student->bts_mention ?? 'N/A',
                    'Montant Bourse' => $student->scholarship_amount,
                    'Ordinateur Éligible' => $student->laptop_eligible ? 'Oui' : 'Non',
                    'Statut' => $student->is_active ? 'Actif' : 'Inactif'
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $exportData,
                'message' => 'Données prêtes pour export'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}