<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassSeriesSubject extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_series_id',
        'subject_id',
        'coefficient',
        'is_active'
    ];

    protected $casts = [
        'coefficient' => 'decimal:2',
        'is_active' => 'boolean'
    ];

    /**
     * Relation avec la série de classe
     */
    public function classSeries()
    {
        return $this->belongsTo(ClassSeries::class, 'class_series_id');
    }

    /**
     * Relation avec la matière
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Scope pour les matières actives dans les séries
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour une série donnée
     */
    public function scopeForSeries($query, $seriesId)
    {
        return $query->where('class_series_id', $seriesId);
    }

    /**
     * Scope pour une matière donnée
     */
    public function scopeForSubject($query, $subjectId)
    {
        return $query->where('subject_id', $subjectId);
    }
}