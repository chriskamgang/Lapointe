<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeacherAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id',
        'series_subject_id',
        'school_year_id',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    /**
     * Relation avec l'enseignant
     */
    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    /**
     * Relation avec la matière-série
     */
    public function seriesSubject()
    {
        return $this->belongsTo(SeriesSubject::class);
    }

    /**
     * Relation avec l'année scolaire
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Accessor pour obtenir la matière via la relation
     */
    public function getSubjectAttribute()
    {
        return $this->seriesSubject?->subject;
    }

    /**
     * Accessor pour obtenir la classe via la relation
     */
    public function getSchoolClassAttribute()
    {
        return $this->seriesSubject?->schoolClass;
    }

    /**
     * Accessor pour obtenir le coefficient via la relation
     */
    public function getCoefficientAttribute()
    {
        return $this->seriesSubject?->coefficient;
    }
}