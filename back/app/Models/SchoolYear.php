<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_current',
        'is_active'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_current' => 'boolean',
        'is_active' => 'boolean'
    ];

    /**
     * Relation avec les élèves
     */
    public function students()
    {
        return $this->hasMany(Student::class);
    }

    /**
     * Scope pour l'année courante
     */
    public function scopeCurrent($query)
    {
        return $query->where('is_current', true);
    }

    /**
     * Scope pour les années actives
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}