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
        $totalEffectiveRequired = $trancheDetails['totalEffectiveRequired']; // Montant requis après bourses/réductions

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

        return (object) [
            'student_id' => $student->id,
            'school_year_id' => $schoolYear->id,
            // Montants normaux affichés partout
            'total_required' => $totalRequired,
            'total_paid' => $totalPaid,
            'total_remaining' => max(0, $totalEffectiveRequired - $totalPaid),
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
        $totalEffectiveRequired = 0; // Montant requis après réductions/bourses

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
            // Vérifier si c'est une tranche de rame et si elle a été payée physiquement
            $isRameTranche = strtolower($tranche->name) === 'rame' || stripos($tranche->name, 'rame') !== false;
            $isPhysicalOnly = $tranche->is_physical_only ?? false;
            $ramePaid = $isRameTranche && $ramePhysicalStatus && $ramePhysicalStatus->brought_physical;
            
            $requiredAmount = $tranche->getAmountForStudent($student, false, false, false); // Montants NORMAUX
            if ($requiredAmount <= 0 && !$isPhysicalOnly) continue; // Pour les tranches physiques, on continue même si le montant est 0

            // Si c'est une rame payée physiquement, ajuster les montants
            if ($ramePaid) {
                $paidAmount = 0; // Considéré comme payé
                $remainingAmount = 0; // Plus rien à payer
                $isFullyPaid = true; // Marqué comme payé
            } else {
                $paidAmount = $paidPerTranche[$tranche->id] ?? 0;
                $remainingAmount = max(0, $requiredAmount - $paidAmount);
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
                    
                    // Pour le statut, considérer qu'une tranche est "complète" si: montant payé + bourse >= montant normal
                    $isFullyPaid = ($paidAmount + $scholarshipAmount) >= $requiredAmount;
                }
                // Vérifier bourse universitaire (s'applique au premier paiement)
                else if ($universityScholarship && $paidAmount == 0) {
                    // Les bourses universitaires s'appliquent proportionnellement sur toutes les tranches
                    $totalTrancheAmount = 0;
                    foreach ($paymentTranches as $t) {
                        $totalTrancheAmount += $t->getAmountForStudent($student, false, false, false);
                    }
                    
                    if ($totalTrancheAmount > 0) {
                        $proportionalScholarship = ($requiredAmount / $totalTrancheAmount) * $universityScholarship['amount'];
                        $scholarshipAmount = min($proportionalScholarship, $requiredAmount);
                        $hasScholarship = true;
                        $scholarshipType = 'university';
                        
                        // Pour le statut, considérer qu'une tranche est "complète" si: montant payé + bourse >= montant normal
                        $isFullyPaid = ($paidAmount + $scholarshipAmount) >= $requiredAmount;
                    }
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

            $trancheStatus[] = [
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
                'discount_percentage' => $hasGlobalDiscount ? $discountPercentage : 0,
                'is_physical_only' => $isPhysicalOnly,
                'rame_paid' => $ramePaid,
            ];

            // Pour les tranches physiques (rame), ne pas inclure dans les totaux si payées
            if (!$isPhysicalOnly || !$ramePaid) {
                $totalRequired += $requiredAmount;
                $totalPaid += $ramePaid ? $requiredAmount : $paidAmount; // Si rame payée, considérer comme totalement payée
                
                // Calculer le montant effectivement requis (avec bourses/réductions)
                $effectiveRequired = $requiredAmount;
                if ($hasScholarship) {
                    $effectiveRequired = max(0, $requiredAmount - $scholarshipAmount);
                } elseif ($hasGlobalDiscount) {
                    $effectiveRequired = $requiredAmount - $globalDiscountAmount;
                }
                
                // Si la rame est payée physiquement, effectiveRequired = 0
                if ($ramePaid) {
                    $effectiveRequired = 0;
                }
                
                $totalEffectiveRequired += $effectiveRequired;
            }
        }

        return [
            'status' => $trancheStatus,
            'totalRequired' => $totalRequired,
            'totalPaid' => $totalPaid,
            'totalEffectiveRequired' => $totalEffectiveRequired,
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