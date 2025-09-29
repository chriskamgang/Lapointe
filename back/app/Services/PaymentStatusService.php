<?php

namespace App\Services;

use App\Models\Student;
use App\Models\SchoolYear;
use App\Models\PaymentTranche;
use App\Models\SchoolSetting;
use App\Models\Payment;
use Carbon\Carbon;

class PaymentStatusService
{
    private $schoolSettings;

    public function __construct()
    {
        $this->schoolSettings = SchoolSetting::getSettings();
    }

    public function getStatusForStudent(Student $student, SchoolYear $schoolYear): object
    {
        $paymentTranches = $this->getApplicableTranches($student);
        $existingPayments = $this->getExistingPayments($student->id, $schoolYear->id);

        // Calculer les totaux et le statut par tranche avec montants NORMAUX
        $trancheDetails = $this->calculateTrancheDetails($student, $paymentTranches, $existingPayments);
        
        // Calculer le montant total des bourses disponibles (pour information)
        $totalScholarshipAmount = $this->calculateTotalScholarshipAmount($student, $paymentTranches);

        $totalRequired = $trancheDetails['totalRequired'];
        $totalPaid = $trancheDetails['totalPaid'];

        $discountInfo = $this->calculateDiscountEligibility(
            $student,
            $totalRequired, // Utiliser les montants normaux pour les réductions
            $totalPaid,
            $existingPayments->count() > 0
        );

        // Calculer le montant total avec réduction si éligible
        $totalRequiredWithDiscount = $totalRequired;
        if ($discountInfo['isEligible']) {
            $totalRequiredWithDiscount = $discountInfo['finalAmount'];
        }

        // Ajouter la bourse GLOBALE au total payé (pas les allocations par tranche)
        $totalPaidWithScholarship = $totalPaid + $totalScholarshipAmount;
        
        return (object) [
            'student_id' => $student->id,
            'school_year_id' => $schoolYear->id,
            // Montants normaux affichés partout
            'total_required' => $totalRequired,
            'total_paid' => $totalPaidWithScholarship, // Inclut la bourse complète
            'total_remaining' => max(0, $totalRequired - $totalPaidWithScholarship),
            // Informations sur les bourses (pour calcul de répartition)
            'total_scholarship_amount' => $totalScholarshipAmount,
            'has_scholarships' => $totalScholarshipAmount > 0,
            'has_existing_payments' => $existingPayments->count() > 0,
            'is_eligible_for_discount' => $discountInfo['isEligible'],
            'discount_deadline' => $this->schoolSettings->scholarship_deadline,
            'discount_percentage' => $this->schoolSettings->reduction_percentage,
            'discount_amount' => $discountInfo['amount'],
            'amount_to_pay_with_discount' => $discountInfo['finalAmount'],
            'total_required_with_discount' => $totalRequiredWithDiscount,
            'payment_tranches' => $paymentTranches,
            'existing_payments' => $existingPayments,
            'tranche_status' => $trancheDetails['status'], // Montants normaux
        ];
    }

    private function getApplicableTranches(Student $student)
    {
        return PaymentTranche::active()
            ->ordered()
            ->with(['classPaymentAmounts' => function ($query) use ($student) {
                if ($student->classSeries && $student->classSeries->schoolClass) {
                    $query->where('class_id', $student->classSeries->schoolClass->id);
                }
            }])
            ->get();
    }

    private function getExistingPayments(int $studentId, int $schoolYearId)
    {
        return Payment::forStudent($studentId)
            ->forYear($schoolYearId)
            ->where('is_rame_physical', false)
            ->with(['paymentDetails.paymentTranche'])
            ->orderBy('payment_date', 'asc')
            ->get();
    }

    private function calculateTrancheDetails(Student $student, $paymentTranches, $existingPayments)
    {
        $trancheStatus = [];
        $totalRequired = 0;
        $totalPaid = 0;

        $isOldStudent = !$student->is_new;       

        // Vérifier si la rame a été payée physiquement
        $ramePhysicalStatus = \App\Models\StudentEquipmentStatus::where('student_id', $student->id)
            ->where('school_year_id', $student->school_year_id)
            ->where('equipment_type', 'rame')
            ->where('brought_physical', true)
            ->first();
        
        $paidPerTranche = [];
        $discountPerTranche = [];
        foreach ($existingPayments as $payment) {
            foreach ($payment->paymentDetails as $detail) {
                if (!isset($paidPerTranche[$detail->payment_tranche_id])) {
                    $paidPerTranche[$detail->payment_tranche_id] = 0;
                    $discountPerTranche[$detail->payment_tranche_id] = [
                        'has_discount' => false,
                        'discount_amount' => 0
                    ];
                }
                $paidPerTranche[$detail->payment_tranche_id] += $detail->amount_allocated;
                
                // Vérifier si ce détail a une réduction globale
                if ($detail->was_reduced && strpos($detail->reduction_context, 'Réduction globale') !== false) {
                    $schoolSettings = \App\Models\SchoolSetting::getSettings();
                    $discountPercentage = $schoolSettings->reduction_percentage ?? 0;
                    
                    // Le montant normal est calculé à partir du montant réduit stocké
                    $reducedAmount = $detail->required_amount_at_time;
                    $normalAmount = round($reducedAmount / (1 - $discountPercentage / 100), 0);
                    $discountAmount = $normalAmount - $reducedAmount;
                    
                    $discountPerTranche[$detail->payment_tranche_id] = [
                        'has_discount' => true,
                        'discount_amount' => $discountAmount
                    ];
                }
            }
        }

        // Récupérer les informations de bourse et réduction
        $discountCalculator = new \App\Services\DiscountCalculatorService();
        $classScholarship = $discountCalculator->getClassScholarship($student);
        $universityScholarship = $discountCalculator->getUniversityScholarship($student);
        $allScholarships = $discountCalculator->getAllScholarships($student);

        foreach ($paymentTranches as $tranche) {
            if ($isOldStudent && stripos($tranche->name, 'Étude de dossier') !== false) {
                continue; // Skip this tranche for old students
            }

            $isOptional = false;
            if ($isOldStudent && (stripos($tranche->name, 'polo') !== false || stripos($tranche->name, 'blouse') !== false)) {
                $isOptional = true;
            }

            // Vérifier si c'est une tranche de rame et si elle a été payée physiquement
            $isRameTranche = strtolower($tranche->name) === 'rame' || stripos($tranche->name, 'rame') !== false;
            $isPhysicalOnly = $tranche->is_physical_only ?? false;
            $ramePaid = $isRameTranche && $ramePhysicalStatus && $ramePhysicalStatus->brought_physical;
            
            $requiredAmount = $tranche->getAmountForStudent($student, false, false, false); // Montants NORMAUX
            if ($requiredAmount <= 0 && !$isPhysicalOnly) continue; // Pour les tranches physiques, on continue même si le montant est 0

            // Calculer le montant payé pour cette tranche
            $electronicPaidAmount = $paidPerTranche[$tranche->id] ?? 0;
            
            // Si c'est une rame : vérifier si payée électroniquement ET physiquement
            if ($isRameTranche) {
                if ($ramePaid && $electronicPaidAmount >= $requiredAmount) {
                    // Rame payée DEUX FOIS (électroniquement + physiquement)
                    // Considérer comme un CRÉDIT supplémentaire de 22,500 FCFA
                    $paidAmount = $requiredAmount + $requiredAmount; // Double paiement = crédit
                } else if ($ramePaid) {
                    // Rame payée SEULEMENT physiquement
                    $paidAmount = $requiredAmount;
                } else {
                    // Rame payée SEULEMENT électroniquement (ou pas du tout)
                    $paidAmount = $electronicPaidAmount;
                }
                $remainingAmount = 0; // Rame toujours considérée comme complète
                $isFullyPaid = true;
            } else {
                // Tranche normale
                $paidAmount = $electronicPaidAmount;
                $remainingAmount = max(0, $requiredAmount - $paidAmount);
                $isFullyPaid = $paidAmount >= $requiredAmount;
            }

            // Vérifier si cette tranche bénéficie d'une bourse
            $scholarshipAmount = 0;
            $hasScholarship = false;
            $globalDiscountAmount = 0;
            $hasGlobalDiscount = false;
            $scholarshipType = null;
            
            // Si c'est une rame payée physiquement, pas de calcul de bourse/réduction
            if ($ramePaid) {
                $isFullyPaid = true;
            } else {
                // Vérifier bourse de classe pour cette tranche spécifique
                if ($classScholarship && $classScholarship->payment_tranche_id == $tranche->id && $discountCalculator->isEligibleForScholarship(now())) {
                    // Cas avec bourse de classe
                    $scholarshipAmount = $classScholarship->amount;
                    $hasScholarship = true;
                    $scholarshipType = 'class';
                    
                    // Pour le statut, une tranche est "complète" si paiement + bourse >= montant requis
                    $isFullyPaid = ($paidAmount + $scholarshipAmount) >= $requiredAmount;
                }
                else {
                    // Cas normal - utiliser les informations de réduction stockées
                    $discountInfo = $discountPerTranche[$tranche->id] ?? ['has_discount' => false, 'discount_amount' => 0];
                    
                    if ($discountInfo['has_discount']) {
                        $hasGlobalDiscount = true;
                        $globalDiscountAmount = $discountInfo['discount_amount'];
                        $isFullyPaid = true; // Si il y a une réduction, c'est que c'est complet
                    } else {
                        $hasGlobalDiscount = false;
                        $globalDiscountAmount = 0;
                        $isFullyPaid = $paidAmount >= $requiredAmount;
                    }
                }
            }

            // Recalculer le montant restant en tenant compte des bourses
            if ($hasScholarship && !$isRameTranche) {
                $totalPaidForTranche = $paidAmount + $scholarshipAmount;
                $remainingAmount = max(0, $requiredAmount - $totalPaidForTranche);
            }

            $trancheStatus[] = [
                'tranche_id' => $tranche->id,
                'tranche_name' => $tranche->name,
                'tranche_description' => $tranche->description,
                'tranche' => $tranche,
                'required_amount' => $requiredAmount,
                'paid_amount' => $paidAmount,
                'remaining_amount' => $remainingAmount,
                'is_fully_paid' => $isFullyPaid,
                'has_scholarship' => $hasScholarship,
                'scholarship_amount' => $scholarshipAmount,
                'scholarship_type' => $scholarshipType,
                'has_global_discount' => $hasGlobalDiscount,
                'global_discount_amount' => $globalDiscountAmount,
                'discount_percentage' => $hasGlobalDiscount ? ($discountPercentage ?? 0) : 0,
                'is_physical_only' => $isPhysicalOnly,
                'is_rame_physical' => $ramePaid,
                'rame_paid' => $ramePaid,
                'is_optional' => $isOptional,
            ];

            // Inclure les tranches dans les totaux
            if ($isOptional) {
                if ($paidAmount > 0) {
                    $totalRequired += $requiredAmount;
                }
            } else {
                $totalRequired += $requiredAmount;
            }
            
            // Total payé = SEULEMENT les paiements effectués
            // (La rame est déjà incluse dans $paidAmount si elle est payée physiquement)
            // (La bourse sera ajoutée globalement à la fin)
            $totalPaid += $paidAmount;
        }

        // Vérifier si le total global est payé (incluant bourses)
        $totalScholarshipAmount = $this->calculateTotalScholarshipAmount($student, $paymentTranches);
        $totalPaidWithScholarship = $totalPaid + $totalScholarshipAmount;
        
        // Si le total est entièrement payé, marquer toutes les tranches comme complètes
        if ($totalPaidWithScholarship >= $totalRequired) {
            foreach ($trancheStatus as &$status) {
                $status['is_fully_paid'] = true;
                $status['remaining_amount'] = 0;
            }
        }

        return [
            'status' => $trancheStatus,
            'totalRequired' => $totalRequired,
            'totalPaid' => $totalPaid,
        ];
    }

    private function calculateTotalScholarshipAmount(Student $student, $paymentTranches)
    {
        $totalScholarshipAmount = 0;
        
        $discountCalculator = new \App\Services\DiscountCalculatorService();
        $classScholarship = $discountCalculator->getClassScholarship($student);
        $universityScholarship = $discountCalculator->getUniversityScholarship($student);
        
        // Priorité: bourse de classe d'abord, puis universitaire
        if ($classScholarship && $discountCalculator->isEligibleForScholarship(now())) {
            // La bourse de classe s'applique à une tranche spécifique
            foreach ($paymentTranches as $tranche) {
                if ($tranche->id == $classScholarship->payment_tranche_id) {
                    $totalScholarshipAmount = $classScholarship->amount;
                    break;
                }
            }
        } else if ($universityScholarship) {
            // La bourse universitaire s'applique au montant total
            $totalScholarshipAmount = $universityScholarship['amount'];
        }
        
        return $totalScholarshipAmount;
    }

    /**
     * Obtenir les détails des tranches avec réduction appliquée
     */
    public function getTranchesWithDiscount(Student $student, SchoolYear $schoolYear): array
    {
        $paymentTranches = $this->getApplicableTranches($student);
        $existingPayments = $this->getExistingPayments($student->id, $schoolYear->id);
        $discountPercentage = $this->schoolSettings->reduction_percentage ?? 0;
        
        $trancheDetails = [];
        $totalRequired = 0;
        $totalRequiredWithDiscount = 0;
        
        foreach ($paymentTranches as $tranche) {
            $normalAmount = $tranche->getAmountForStudent($student, false, false, false, false);
            if ($normalAmount <= 0) continue;
            
            $discountAmount = round($normalAmount * ($discountPercentage / 100), 0);
            $reducedAmount = $normalAmount - $discountAmount;
            
            $trancheDetails[] = [
                'tranche' => $tranche,
                'normal_amount' => $normalAmount,
                'discount_amount' => $discountAmount,
                'reduced_amount' => $reducedAmount,
                'discount_percentage' => $discountPercentage
            ];
            
            $totalRequired += $normalAmount;
            $totalRequiredWithDiscount += $reducedAmount;
        }
        
        return [
            'tranches' => $trancheDetails,
            'total_normal' => $totalRequired,
            'total_with_discount' => $totalRequiredWithDiscount,
            'total_discount_amount' => $totalRequired - $totalRequiredWithDiscount,
            'discount_percentage' => $discountPercentage
        ];
    }

    private function calculateDiscountEligibility(Student $student, float $totalRequired, float $totalPaid, bool $hasExistingPayments)
    {
        $isEligible = false;
        $discountAmount = 0;
        $finalAmount = $totalRequired - $totalPaid;

        $deadline = $this->schoolSettings->scholarship_deadline;
        $percentage = $this->schoolSettings->reduction_percentage;

        // Vérifier que l'étudiant n'a pas de bourse (exclusion mutuelle)
        $discountCalculator = new \App\Services\DiscountCalculatorService();
        $hasClassScholarship = $discountCalculator->getClassScholarship($student) !== null;
        $hasUniversityScholarship = $discountCalculator->getUniversityScholarship($student) !== null;
        $hasScholarship = $hasClassScholarship || $hasUniversityScholarship;

        if ($deadline && $percentage > 0 && !$hasExistingPayments && $totalPaid == 0 && !$hasScholarship) {
            $isEligible = true;
            $discountAmount = $totalRequired * ($percentage / 100);
            $finalAmount = $totalRequired - $discountAmount;
        }

        return [
            'isEligible' => $isEligible,
            'amount' => $discountAmount,
            'finalAmount' => $finalAmount,
        ];
    }
}