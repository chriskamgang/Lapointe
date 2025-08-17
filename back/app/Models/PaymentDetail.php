<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'payment_tranche_id',
        'amount_allocated',
        'previous_amount',
        'new_total_amount',
        'is_fully_paid',
        'required_amount_at_time',
        'was_reduced',
        'reduction_context'
    ];

    protected $casts = [
        'amount_allocated' => 'decimal:2',
        'previous_amount' => 'decimal:2',
        'new_total_amount' => 'decimal:2',
        'required_amount_at_time' => 'decimal:2',
        'is_fully_paid' => 'boolean',
        'was_reduced' => 'boolean'
    ];

    /**
     * Relation avec le paiement principal
     */
    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * Relation avec la tranche de paiement
     */
    public function paymentTranche()
    {
        return $this->belongsTo(PaymentTranche::class);
    }

    /**
     * Calculer le montant restant à payer pour cette tranche
     */
    public function getRemainingAmount($totalTrancheAmount)
    {
        return max(0, $totalTrancheAmount - $this->new_total_amount);
    }
}