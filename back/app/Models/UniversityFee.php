<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UniversityFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'level_type',
        'speciality',
        'inscription_fee',
        'first_installment',
        'second_installment',
        'third_installment',
        'total_annual_fee',
        'duration_years',
        'included_benefits',
        'is_active'
    ];

    protected $casts = [
        'inscription_fee' => 'decimal:2',
        'first_installment' => 'decimal:2',
        'second_installment' => 'decimal:2',
        'third_installment' => 'decimal:2',
        'total_annual_fee' => 'decimal:2',
        'duration_years' => 'integer',
        'is_active' => 'boolean'
    ];

    // Relations
    public function school()
    {
        return $this->belongsTo(School::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeBySchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    public function scopeByLevelType($query, $levelType)
    {
        return $query->where('level_type', $levelType);
    }

    // Accessors
    public function getFormattedTotalFeeAttribute()
    {
        return number_format($this->total_annual_fee, 0, ',', ' ') . ' FCFA';
    }

    public function getIncludedBenefitsArrayAttribute()
    {
        return $this->included_benefits ? explode(', ', $this->included_benefits) : [];
    }
}