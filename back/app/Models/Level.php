<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Level extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'section_id',
        'description',
        'order',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer'
    ];

    /**
     * Relation avec la section
     */
    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Relation avec les classes
     */
    public function schoolClasses()
    {
        return $this->hasMany(SchoolClass::class, 'level_id');
    }

    /**
     * Scope pour les niveaux actifs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour ordonner les niveaux
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }
}