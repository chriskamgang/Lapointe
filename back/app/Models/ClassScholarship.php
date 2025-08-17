<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassScholarship extends Model
{
    protected $fillable = [
        'school_class_id',
        'payment_tranche_id',
        'name',
        'description',
        'amount',
        'is_active'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_active' => 'boolean'
    ];

    /**
     * Relation avec la classe
     */
    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    /**
     * Relation avec la tranche de paiement
     */
    public function paymentTranche()
    {
        return $this->belongsTo(PaymentTranche::class);
    }

    /**
     * Scope pour les bourses actives
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
