<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentEquipmentStatus;
use App\Models\SchoolYear;
use App\Models\ClassScholarship;
use App\Models\UniversityScholarship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class StudentEquipmentController extends Controller
{
    /**
     * Obtenir le statut des équipements pour un étudiant
     */
    public function getEquipmentStatus($studentId, $yearId)
    {
        try {
            $student = Student::with([
                'classSeries.schoolClass.level.school'
            ])->findOrFail($studentId);

            $schoolYear = SchoolYear::findOrFail($yearId);

            // Déterminer les équipements requis selon l'école et la filière
            $requiredEquipments = $this->getRequiredEquipmentsForStudent($student);

            $equipmentStatus = [];
            
            foreach ($requiredEquipments as $equipmentType => $isRequired) {
                if ($isRequired) {
                    $status = StudentEquipmentStatus::where([
                        'student_id' => $studentId,
                        'school_year_id' => $yearId,
                        'equipment_type' => $equipmentType
                    ])->first();

                    $equipmentStatus[$equipmentType] = [
                        'equipment_type' => $equipmentType,
                        'is_required' => true,
                        'price' => $this->getEquipmentPrice($equipmentType, $student),
                        'has_paid_for' => $status ? $status->has_paid_for : false,
                        'has_received' => $status ? $status->has_received : false,
                        'brought_physical' => $status ? $status->brought_physical : false,
                        'paid_date' => $status ? $status->paid_date : null,
                        'received_date' => $status ? $status->received_date : null,
                        'notes' => $status ? $status->notes : null,
                        'can_receive' => $status ? $status->canReceiveEquipment() : false
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $equipmentStatus,
                'message' => 'Statut des équipements récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du statut des équipements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les informations de bourse pour un étudiant
     */
    public function getScholarshipInfo($studentId, $yearId)
    {
        try {
            $student = Student::with([
                'classSeries.schoolClass.level.school',
                'classSeries.schoolClass.classScholarships' => function($query) {
                    $query->where('is_active', true);
                }
            ])->findOrFail($studentId);

            $scholarshipInfo = [
                'eligible' => false,
                'amount' => 0,
                'type' => null,
                'conditions' => [],
                'bts_mention' => null // Pour ESGIT Licence Pro
            ];

            $schoolCode = $student->classSeries->schoolClass->level->school->code;
            $levelType = $student->classSeries->schoolClass->level->level_type;
            $currentLevel = $student->current_level ?? 1;

            // Vérifier l'éligibilité selon les règles spécifiées
            if ($this->isEligibleForScholarship($student, $schoolCode, $levelType)) {
                $scholarshipInfo['eligible'] = true;
                $scholarshipInfo['amount'] = $this->calculateScholarshipAmount(
                    $schoolCode, 
                    $levelType, 
                    $currentLevel, 
                    $student
                );
                $scholarshipInfo['type'] = $this->getScholarshipType($schoolCode, $levelType);
                $scholarshipInfo['conditions'] = $this->getScholarshipConditions($schoolCode, $levelType);
            }

            return response()->json([
                'success' => true,
                'data' => $scholarshipInfo,
                'message' => 'Informations de bourse récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des informations de bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Traiter un paiement d'équipement
     */
    public function processEquipmentPayment(Request $request, $studentId)
    {
        $validator = Validator::make($request->all(), [
            'equipment_type' => 'required|in:polo,blouse,laptop,rame',
            'payment_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $student = Student::findOrFail($studentId);
            $schoolYear = SchoolYear::where('is_working_year', true)->first();

            // Vérifier si l'équipement est requis pour cet étudiant
            $requiredEquipments = $this->getRequiredEquipmentsForStudent($student);
            
            if (!isset($requiredEquipments[$request->equipment_type]) || 
                !$requiredEquipments[$request->equipment_type]) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet équipement n\'est pas requis pour cet étudiant'
                ], 422);
            }

            // Vérifier le montant
            $expectedPrice = $this->getEquipmentPrice($request->equipment_type, $student);
            if ($request->payment_amount < $expectedPrice) {
                return response()->json([
                    'success' => false,
                    'message' => "Montant insuffisant. Prix attendu: {$expectedPrice} FCFA"
                ], 422);
            }

            // Enregistrer ou mettre à jour le statut de l'équipement
            $equipmentStatus = StudentEquipmentStatus::updateOrCreate([
                'student_id' => $studentId,
                'school_year_id' => $schoolYear->id,
                'equipment_type' => $request->equipment_type
            ], [
                'has_paid_for' => true,
                'paid_date' => Carbon::now(),
                'notes' => $request->notes ?? "Paiement de {$request->payment_amount} FCFA par {$request->payment_method}"
            ]);

            return response()->json([
                'success' => true,
                'data' => $equipmentStatus->load('student'),
                'message' => 'Paiement d\'équipement enregistré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du traitement du paiement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Déterminer les équipements requis pour un étudiant
     */
    private function getRequiredEquipmentsForStudent($student)
    {
        $schoolCode = $student->classSeries->schoolClass->level->school->code;
        $levelType = $student->classSeries->schoolClass->level->level_type;
        $specialityCode = $student->classSeries->schoolClass->speciality_code;

        $equipment = [
            'polo' => false,
            'blouse' => false,
            'laptop' => false,
            'rame' => true // Par défaut toutes les écoles sauf ISTMS
        ];

        // ISTMS : Pas de rames, mais blouses
        if ($schoolCode === 'ISTMS') {
            $equipment['rame'] = false;
            $equipment['blouse'] = true;
            return $equipment;
        }

        // INSSAS : Toujours blouses pour filières santé
        if ($schoolCode === 'INSSAS') {
            $equipment['blouse'] = true;
            $equipment['laptop'] = in_array($levelType, ['LICENCE_ACA', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO']);
            return $equipment;
        }

        // ESGIT : Toujours polos et laptops
        if ($schoolCode === 'ESGIT') {
            $equipment['polo'] = true;
            $equipment['laptop'] = true;
            return $equipment;
        }

        // ESJEC : Polos et laptops pour BTS seulement
        if ($schoolCode === 'ESJEC') {
            $equipment['polo'] = true;
            $equipment['laptop'] = ($levelType === 'BTS');
            return $equipment;
        }

        // ESSIT : Polos et laptops
        if ($schoolCode === 'ESSIT') {
            $equipment['polo'] = true;
            $equipment['laptop'] = true;
            return $equipment;
        }

        // ISTPM : Blouse pour filières santé, polo pour autres
        if ($schoolCode === 'ISTPM') {
            $healthSpecialties = ['Technicien Adjoint de Laboratoire', 'Auxiliaire de Puériculture', 'Assistant en Cabinet Médical', 'Auxiliaire de Vie', 'Massothérapie', 'Délégué Médical', 'Vendeur en Pharmacie', 'Secrétariat Médical'];
            
            $isHealthSpecialty = false;
            foreach ($healthSpecialties as $specialty) {
                if (stripos($specialityCode, $specialty) !== false || stripos($student->classSeries->schoolClass->name, $specialty) !== false) {
                    $isHealthSpecialty = true;
                    break;
                }
            }
            
            $equipment['blouse'] = $isHealthSpecialty;
            $equipment['polo'] = !$isHealthSpecialty;
            return $equipment;
        }

        return $equipment;
    }

    /**
     * Obtenir le prix d'un équipement selon l'école
     */
    private function getEquipmentPrice($equipmentType, $student)
    {
        $schoolCode = $student->classSeries->schoolClass->level->school->code;

        $prices = [
            'INSSAS' => ['blouse' => 7500, 'rame' => 22500],
            'ESGIT' => ['polo' => 6500, 'rame' => 22500],
            'ESJEC' => ['polo' => 6500, 'rame' => 22500],
            'ESSIT' => ['polo' => 6500, 'rame' => 22500],
            'ISTPM' => ['polo' => 6500, 'blouse' => 7500, 'rame' => 18500],
            'ISTMS' => ['blouse' => 7500]
        ];

        return $prices[$schoolCode][$equipmentType] ?? 0;
    }

    /**
     * Vérifier l'éligibilité aux bourses
     */
    private function isEligibleForScholarship($student, $schoolCode, $levelType)
    {
        // INSSAS : BTS, Double Diplomation, Licence Pro, Master Pro
        if ($schoolCode === 'INSSAS') {
            return in_array($levelType, ['BTS', 'HND', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO', 'MASTER_PRO']);
        }

        // ESGIT : Licence Pro (selon mention BTS), Ingénierie 3ème année
        if ($schoolCode === 'ESGIT') {
            return in_array($levelType, ['LICENCE_PRO', 'INGENIERIE']);
        }

        // ESSIT : Ingénierie Second Cycle seulement
        if ($schoolCode === 'ESSIT') {
            return ($levelType === 'INGENIERIE_SC');
        }

        // ISTPM : CQP et DQP
        if ($schoolCode === 'ISTPM') {
            return in_array($levelType, ['CQP', 'DQP']);
        }

        return false;
    }

    /**
     * Calculer le montant de la bourse
     */
    private function calculateScholarshipAmount($schoolCode, $levelType, $currentLevel, $student)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                if (in_array($levelType, ['BTS', 'HND'])) {
                    return $currentLevel === 1 ? 50000 : 100000;
                }
                if ($levelType === 'DOUBLE_DIPLOMATION') {
                    return $currentLevel === 1 ? 50000 : 100000;
                }
                if ($levelType === 'LICENCE_PRO') {
                    return 100000;
                }
                if ($levelType === 'MASTER_PRO') {
                    return $currentLevel <= 2 ? 150000 : 0;
                }
                break;

            case 'ESGIT':
                if ($levelType === 'LICENCE_PRO') {
                    // Bourses selon mention BTS
                    $btsMention = $this->getBTSMention($student);
                    $scholarships = [
                        'passable' => 50000,
                        'assez_bien' => 100000,
                        'bien' => 120000,
                        'tres_bien' => 150000
                    ];
                    return $scholarships[$btsMention] ?? 50000;
                }
                if ($levelType === 'INGENIERIE') {
                    return 50000; // 3ème année
                }
                break;

            case 'ESSIT':
                if ($levelType === 'INGENIERIE_SC') {
                    return 50000; // Niveaux 3, 4, 5
                }
                break;

            case 'ISTPM':
                return 25000; // CQP et DQP
                break;
        }

        return 0;
    }

    /**
     * Obtenir la mention BTS (pour ESGIT Licence Pro)
     */
    private function getBTSMention($student)
    {
        // Cette information devrait être stockée dans le profil étudiant
        // Pour l'instant, on retourne une valeur par défaut
        return $student->bts_mention ?? 'passable';
    }

    /**
     * Obtenir le type de bourse
     */
    private function getScholarshipType($schoolCode, $levelType)
    {
        if ($schoolCode === 'ESGIT' && $levelType === 'LICENCE_PRO') {
            return 'bourse_mention_bts';
        }
        
        if (in_array($schoolCode, ['INSSAS', 'ESSIT', 'ISTPM'])) {
            return 'bourse_automatique';
        }

        return 'autre';
    }

    /**
     * Obtenir les conditions de bourse
     */
    private function getScholarshipConditions($schoolCode, $levelType)
    {
        $conditions = [];

        switch ($schoolCode) {
            case 'INSSAS':
                $conditions[] = 'Bourse automatique selon le niveau d\'études';
                $conditions[] = 'Montants: 50 000 FCFA (niveau 1), 100 000 FCFA (niveaux 2+)';
                break;

            case 'ESGIT':
                if ($levelType === 'LICENCE_PRO') {
                    $conditions[] = 'Bourse selon mention obtenue au BTS';
                    $conditions[] = 'Passable: 50 000 FCFA, Assez Bien: 100 000 FCFA';
                    $conditions[] = 'Bien: 120 000 FCFA, Très Bien: 150 000 FCFA + laptop';
                } else {
                    $conditions[] = 'Bourse de 50 000 FCFA par an pour Ingénierie 3ème année';
                }
                break;

            case 'ESSIT':
                $conditions[] = 'Bourse de 50 000 FCFA par an pour Ingénierie Second Cycle';
                $conditions[] = 'Niveaux 3, 4 et 5 éligibles';
                break;

            case 'ISTPM':
                $conditions[] = 'Bourse automatique de 25 000 FCFA par an';
                $conditions[] = 'Applicable à tous les CQP et DQP';
                break;
        }

        return $conditions;
    }
}