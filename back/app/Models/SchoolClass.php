<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    use HasFactory;

    protected $table = 'school_classes';

    protected $fillable = [
        'name',
        'level_id',
        'description',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    /**
     * Relation avec le niveau
     */
    public function level()
    {
        return $this->belongsTo(Level::class);
    }

    /**
     * Relation avec les séries/variantes
     */
    public function series()
    {
        return $this->hasMany(ClassSeries::class, 'class_id');
    }

    /**
     * Relation avec les montants de paiement
     */
    public function paymentAmounts()
    {
        return $this->hasMany(ClassPaymentAmount::class, 'class_id');
    }

    /**
     * Relation avec les étudiants via les séries
     */
    public function students()
    {
        return $this->hasManyThrough(Student::class, ClassSeries::class, 'class_id', 'class_series_id');
    }

    /**
     * Relation avec les bourses de classe
     */
    public function classScholarships()
    {
        return $this->hasMany(ClassScholarship::class, 'school_class_id');
    }

    /**
     * Scope pour les classes actives
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Obtenir les tranches de paiement configurées pour cette classe
     */
    public function getConfiguredTranches()
    {
        return $this->paymentAmounts()
            ->with('paymentTranche')
            ->join('payment_tranches', 'payment_tranches.id', '=', 'class_payment_amounts.payment_tranche_id')
            ->orderBy('payment_tranches.order')
            ->get();
    }

    /**
     * Vérifier si une tranche est configurée pour cette classe
     */
    public function hasTrancheConfigured($trancheId)
    {
        return $this->paymentAmounts()
            ->where('payment_tranche_id', $trancheId)
            ->exists();
    }
}