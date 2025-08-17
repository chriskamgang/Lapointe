<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassPaymentAmount extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_id',
        'payment_tranche_id',
        'amount',
        'is_required'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_required' => 'boolean'
    ];

    /**
     * Relation avec la classe
     */
    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    /**
     * Relation avec la tranche de paiement
     */
    public function paymentTranche()
    {
        return $this->belongsTo(PaymentTranche::class);
    }

    /**
     * Obtenir le montant (simplifié - plus de différenciation nouveau/ancien)
     */
    public function getAmountForStudent($isNewStudent = true)
    {
        return $this->amount;
    }
}