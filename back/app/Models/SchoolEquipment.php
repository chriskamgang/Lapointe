<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolEquipment extends Model
{
    protected $table = 'school_equipment';

    protected $fillable = [
        'school_id',
        'equipment_type',
        'item_name', 
        'price',
        'category',
        'description',
        'is_mandatory',
        'applicable_levels',
        'applicable_specialties',
        'is_active',
        'order'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_mandatory' => 'boolean',
        'is_active' => 'boolean',
        'applicable_levels' => 'array',
        'applicable_specialties' => 'array'
    ];

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    // Scopes pour filtrer par type d'équipement
    public function scopeClothing($query)
    {
        return $query->where('equipment_type', 'clothing');
    }

    public function scopeMedical($query)
    {
        return $query->where('equipment_type', 'medical');
    }

    public function scopeTechnical($query)
    {
        return $query->where('equipment_type', 'technical');
    }

    public function scopeSecurity($query)
    {
        return $query->where('equipment_type', 'security');
    }

    public function scopeAcademic($query)
    {
        return $query->where('equipment_type', 'academic');
    }

    public function scopeMandatory($query)
    {
        return $query->where('is_mandatory', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Méthodes utilitaires pour les équipements par école
    public static function getEquipmentForSchool($schoolCode, $level = null, $specialty = null)
    {
        $query = self::join('schools', 'school_equipment.school_id', '=', 'schools.id')
            ->where('schools.code', $schoolCode)
            ->where('school_equipment.is_active', true)
            ->select('school_equipment.*');

        if ($level) {
            $query->where(function($q) use ($level) {
                $q->whereJsonContains('applicable_levels', $level)
                  ->orWhereNull('applicable_levels');
            });
        }

        if ($specialty) {
            $query->where(function($q) use ($specialty) {
                $q->whereJsonContains('applicable_specialties', $specialty)
                  ->orWhereNull('applicable_specialties');
            });
        }

        return $query->orderBy('order')->get();
    }

    // Méthode pour obtenir les vêtements requis par école
    public static function getRequiredClothingForSchool($schoolCode)
    {
        return self::getEquipmentForSchool($schoolCode)
            ->where('equipment_type', 'clothing')
            ->where('is_mandatory', true);
    }
}
