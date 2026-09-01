<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UniversityScholarship extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'level_type',
        'formation_name',
        'scholarship_amount',
        'laptop_included',
        'conditions',
        'is_active'
    ];

    protected $casts = [
        'scholarship_amount' => 'decimal:2',
        'laptop_included' => 'boolean',
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

    public function scopeByLevelType($query, $levelType)
    {
        return $query->where('level_type', $levelType);
    }

    public function scopeWithLaptop($query)
    {
        return $query->where('laptop_included', true);
    }
}