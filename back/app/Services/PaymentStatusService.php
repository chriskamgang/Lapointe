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
        $scholarship = $discountCalculator->getClassScholarship($student);

        foreach ($paymentTranches as $tranche) {
            $requiredAmount = $tranche->getAmountForStudent($student, false, false, false); // Montants NORMAUX
            if ($requiredAmount <= 0) continue;

            $paidAmount = $paidPerTranche[$tranche->id] ?? 0;
            $remainingAmount = max(0, $requiredAmount - $paidAmount);

            // Vérifier si cette tranche bénéficie d'une bourse
            $scholarshipAmount = 0;
            $hasScholarship = false;
            $globalDiscountAmount = 0;
            $hasGlobalDiscount = false;
            
            if ($scholarship && $scholarship->payment_tranche_id == $tranche->id && $discountCalculator->isEligibleForScholarship(now())) {
                // Cas avec bourse
                $scholarshipAmount = $scholarship->amount;
                $hasScholarship = true;
                
                // Pour le statut, considérer qu'une tranche est "complète" si: montant payé + bourse >= montant normal
                $isFullyPaid = ($paidAmount + $scholarshipAmount) >= $requiredAmount;
            } else {
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

            $trancheStatus[] = [
                'tranche' => $tranche,
                'required_amount' => $requiredAmount,
                'paid_amount' => $paidAmount,
                'remaining_amount' => $remainingAmount,
                'is_fully_paid' => $isFullyPaid,
                'has_scholarship' => $hasScholarship,
                'scholarship_amount' => $scholarshipAmount,
                'has_global_discount' => $hasGlobalDiscount,
                'global_discount_amount' => $globalDiscountAmount,
                'discount_percentage' => $hasGlobalDiscount ? $discountPercentage : 0,
            ];

            $totalRequired += $requiredAmount;
            $totalPaid += $paidAmount;
            
            // Calculer le montant effectivement requis (avec bourses/réductions)
            $effectiveRequired = $requiredAmount;
            if ($hasScholarship) {
                $effectiveRequired = max(0, $requiredAmount - $scholarshipAmount);
            } elseif ($hasGlobalDiscount) {
                $effectiveRequired = $requiredAmount - $globalDiscountAmount;
            }
            $totalEffectiveRequired += $effectiveRequired;
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
        $scholarship = $discountCalculator->getClassScholarship($student);
        
        if ($scholarship && $discountCalculator->isEligibleForScholarship(now())) {
            // La bourse s'applique à une tranche spécifique
            foreach ($paymentTranches as $tranche) {
                if ($tranche->id == $scholarship->payment_tranche_id) {
                    $totalScholarshipAmount = $scholarship->amount;
                    break;
                }
            }
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
        $hasScholarship = $discountCalculator->getClassScholarship($student) !== null;

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