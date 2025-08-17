<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTranche extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'order',
        'is_active',
        'default_amount',
        'use_default_amount',
        'deadline'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
        'default_amount' => 'decimal:2',
        'use_default_amount' => 'boolean',
        'deadline' => 'date'
    ];

    /**
     * Relation avec les montants de classes
     */
    public function classPaymentAmounts()
    {
        return $this->hasMany(ClassPaymentAmount::class);
    }

    /**
     * Scope pour les tranches actives
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour ordonner les tranches
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    /**
     * Obtenir le montant pour un étudiant selon sa classe (simplifié)
     */
    public function getAmountForStudent($student, $isNewStudent = true, $applyReduction = false, $applyScholarship = false, $applyGlobalDiscount = false)
    {
        $baseAmount = 0;
        
        // Si cette tranche utilise un montant par défaut (comme RAME)
        if ($this->use_default_amount && $this->default_amount) {
            $baseAmount = $this->default_amount;
        } else {
            // Sinon, utiliser le montant unique par classe
            $classPaymentAmount = $this->classPaymentAmounts()
                ->where('class_id', $student->classSeries->schoolClass->id)
                ->first();

            if (!$classPaymentAmount) {
                return 0;
            }

            $baseAmount = $classPaymentAmount->amount;
        }
        
        // Appliquer la réduction de 10% si l'étudiant y est éligible
        if ($applyReduction) {
            $schoolSettings = \App\Models\SchoolSetting::getSettings();
            $reductionPercentage = $schoolSettings->reduction_percentage ?? 10;
            // Arrondir le résultat pour éviter les problèmes de virgule flottante
            $baseAmount = round($baseAmount * (100 - $reductionPercentage) / 100, 0);
        }
        
        // RÈGLE MÉTIER : Bourses et réductions sont mutuellement exclusives
        $discountCalculator = new \App\Services\DiscountCalculatorService();
        $scholarship = $discountCalculator->getClassScholarship($student);
        $hasScholarship = $scholarship !== null;
        $scholarshipApplied = false;
        
        // Appliquer la bourse si elle s'applique à cette tranche (PRIORITÉ)
        if ($applyScholarship && $hasScholarship) {
            if ($scholarship->payment_tranche_id == $this->id && $discountCalculator->isEligibleForScholarship(now())) {
                $scholarshipAmount = min($scholarship->amount, $baseAmount);
                $baseAmount = max(0, $baseAmount - $scholarshipAmount);
                $scholarshipApplied = true;
            }
        }
        
        // Appliquer la réduction globale SEULEMENT si aucune bourse n'a été appliquée
        if ($applyGlobalDiscount && !$scholarshipApplied && !$hasScholarship) {
            $schoolSettings = \App\Models\SchoolSetting::getSettings();
            $discountPercentage = $schoolSettings->reduction_percentage ?? 0;
            
            if ($discountPercentage > 0) {
                $baseAmount = round($baseAmount * (100 - $discountPercentage) / 100, 0);
            }
        }
        
        return $baseAmount;
    }
}