<?php

namespace App\Services;

use App\Models\Student;
use App\Models\SchoolSetting;
use App\Models\ClassScholarship;
use Carbon\Carbon;

class DiscountCalculatorService
{
    private $schoolSettings;

    public function __construct()
    {
        $this->schoolSettings = SchoolSetting::getSettings();
    }

    /**
     * Détermine si un paiement est éligible à une réduction globale.
     * RÈGLE: Pas de réduction si la classe a une bourse.
     *
     * @param Student $student L'étudiant
     * @param float $amountToPay Le montant que l'utilisateur essaie de payer.
     * @param float $totalRemaining Le solde total restant pour l'étudiant.
     * @param string|Carbon $versementDate La date à laquelle le paiement est effectué.
     * @param bool $hasExistingPayments Indique si l'étudiant a déjà fait des paiements.
     * @return bool
     */
    public function isEligibleForGlobalDiscount($student, float $amountToPay, float $totalRemaining, $versementDate, bool $hasExistingPayments): bool
    {
        $deadline = $this->schoolSettings->scholarship_deadline;
        $percentage = $this->schoolSettings->reduction_percentage;

        // Condition 1: Les paramètres de réduction doivent exister.
        if (!$deadline || !$percentage > 0) {
            return false;
        }

        // Condition 2: La classe ne doit PAS avoir de bourse (exclusion mutuelle)
        if ($this->getClassScholarship($student)) {
            return false;
        }

        // Condition 3: L'étudiant ne doit avoir aucun paiement antérieur.
        if ($hasExistingPayments) {
            return false;
        }

        // Condition 4: Le montant payé doit être égal au solde total avec réduction (paiement intégral réduit).
        $totalWithDiscount = $totalRemaining * (1 - $percentage / 100);
        if (abs($amountToPay - $totalWithDiscount) > 0.01) {
            return false;
        }

        // Condition 5: La date de versement doit être avant ou à la date limite.
        if (Carbon::parse($versementDate)->isAfter($deadline)) {
            return false;
        }

        // Si toutes les conditions sont remplies, l'étudiant est éligible.
        return true;
    }

    /**
     * Ancienne méthode maintenue pour compatibilité
     */
    public function isEligibleForDiscount(float $amountToPay, float $totalRemaining, $versementDate, bool $hasExistingPayments): bool
    {
        // Cette méthode est maintenue pour compatibilité mais ne vérifie pas l'exclusion avec les bourses
        $deadline = $this->schoolSettings->scholarship_deadline;
        $percentage = $this->schoolSettings->reduction_percentage;

        if (!$deadline || !$percentage > 0) {
            return false;
        }

        if ($hasExistingPayments) {
            return false;
        }

        if (abs($amountToPay - $totalRemaining) > 0.01) {
            return false;
        }

        if (Carbon::parse($versementDate)->isAfter($deadline)) {
            return false;
        }

        return true;
    }
    
    /**
     * Calcule le résultat final d'un paiement, en appliquant les réductions si éligible.
     *
     * @param object $paymentStatus L'objet retourné par PaymentStatusService.
     * @param float $amountPaid Le montant réel que l'utilisateur paie.
     * @param string|Carbon $versementDate La date du versement.
     * @return array
     */
    public function calculateFinalPayment(object $paymentStatus, float $amountPaid, $versementDate): array
    {
        $isEligible = $this->isEligibleForDiscount(
            $amountPaid,
            $paymentStatus->total_remaining,
            $versementDate,
            $paymentStatus->has_existing_payments
        );

        if ($isEligible) {
            return [
                'final_amount' => $paymentStatus->amount_to_pay_with_discount,
                'has_reduction' => true,
                'reduction_amount' => $paymentStatus->discount_amount,
                'discount_reason' => "Réduction {$paymentStatus->discount_percentage}% pour paiement intégral avant le " . Carbon::parse($paymentStatus->discount_deadline)->format('d/m/Y'),
            ];
        }

        return [
            'final_amount' => $amountPaid,
            'has_reduction' => false,
            'reduction_amount' => 0,
            'discount_reason' => null,
        ];
    }

    /**
     * Récupère la bourse applicable pour la classe d'un étudiant
     * NOUVELLE LOGIQUE: Vérifier que l'étudiant a activé les bourses
     *
     * @param Student $student
     * @return ClassScholarship|null
     */
    public function getClassScholarship(Student $student): ?ClassScholarship
    {
        // Vérifier d'abord si l'étudiant a activé les bourses
        if (!$student->has_scholarship_enabled) {
            return null;
        }

        if (!$student->classSeries || !$student->classSeries->schoolClass) {
            return null;
        }

        return ClassScholarship::active()
            ->where('school_class_id', $student->classSeries->schoolClass->id)
            ->first();
    }

    /**
     * Détermine si l'étudiant est éligible aux bourses à la date donnée
     *
     * @param Carbon|string $currentDate
     * @return bool 
     */
    public function isEligibleForScholarship($currentDate): bool
    {
        $deadline = $this->schoolSettings->scholarship_deadline;
        
        if (!$deadline) {
            return true; // Pas de deadline = toujours éligible
        }

        return Carbon::parse($currentDate)->isBefore($deadline) || 
               Carbon::parse($currentDate)->isSameDay($deadline);
    }

    /**
     * Calcule la réduction globale sur toutes les tranches
     *
     * @param Student $student
     * @param float $originalAmount
     * @return array
     */
    public function calculateGlobalDiscount($student, float $originalAmount): array
    {
        $discountPercentage = $this->schoolSettings->reduction_percentage ?? 0;
        
        if ($discountPercentage <= 0) {
            return [
                'has_discount' => false,
                'discount_percentage' => 0,
                'discount_amount' => 0,
                'final_amount' => $originalAmount
            ];
        }

        $discountAmount = $originalAmount * ($discountPercentage / 100);
        $finalAmount = $originalAmount - $discountAmount;

        return [
            'has_discount' => true,
            'discount_percentage' => $discountPercentage,
            'discount_amount' => $discountAmount,
            'final_amount' => $finalAmount,
            'discount_reason' => "Réduction {$discountPercentage}% - Paiement intégral avant échéance"
        ];
    }

    /**
     * Détermine le type de paiement pour un étudiant
     *
     * @param Student $student
     * @param float $paymentAmount
     * @param string $versementDate
     * @return string
     */
    public function getPaymentType($student, float $paymentAmount, float $totalRemaining, $versementDate, bool $hasExistingPayments): string
    {
        // Vérifier si a une bourse
        if ($this->getClassScholarship($student)) {
            return 'scholarship';
        }
        
        // Vérifier si éligible à la réduction
        if ($this->isEligibleForGlobalDiscount($student, $paymentAmount, $totalRemaining, $versementDate, $hasExistingPayments)) {
            return 'global_discount';
        }
        
        // Cas normal - ni bourse ni réduction
        return 'normal';
    }

    /**
     * Obtenir le pourcentage de réduction configuré
     */
    public function getDiscountPercentage(): float
    {
        return $this->schoolSettings->reduction_percentage ?? 0;
    }
}
