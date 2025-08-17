<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassSeries extends Model
{
    use HasFactory;

    protected $fillable = [
        'class_id',
        'name',
        'code',
        'capacity',
        'is_active',
        'main_teacher_id',
        'school_year_id'
    ];

    protected $casts = [
        'capacity' => 'integer',
        'is_active' => 'boolean'
    ];

    /**
     * Relation avec la classe mère
     */
    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    /**
     * Relation avec les étudiants
     */
    public function students()
    {
        return $this->hasMany(Student::class, 'class_series_id');
    }

    /**
     * Scope pour les séries actives
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Relation avec le professeur principal
     */
    public function mainTeacher()
    {
        return $this->belongsTo(Teacher::class, 'main_teacher_id');
    }

    /**
     * Relation avec l'année scolaire
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Relation avec les matières enseignées
     */
    public function subjects()
    {
        return $this->belongsToMany(Subject::class, 'class_series_subjects')
                    ->withPivot('coefficient', 'is_active')
                    ->withTimestamps();
    }

    /**
     * Relation avec les matières actives uniquement
     */
    public function activeSubjects()
    {
        return $this->belongsToMany(Subject::class, 'class_series_subjects')
                    ->withPivot('coefficient', 'is_active')
                    ->wherePivot('is_active', true)
                    ->withTimestamps();
    }

    /**
     * Relation avec les assignations enseignant-matière
     */
    public function teacherSubjects()
    {
        return $this->hasMany(TeacherSubject::class, 'class_series_id');
    }

    /**
     * Obtenir le nom complet de la série
     */
    public function getFullNameAttribute()
    {
        return $this->schoolClass->name . ' ' . $this->name;
    }

    /**
     * Obtenir les enseignants de cette série pour une année donnée
     */
    public function getTeachersForYear($yearId)
    {
        return $this->teacherSubjects()
                    ->with(['teacher', 'subject'])
                    ->where('school_year_id', $yearId)
                    ->where('is_active', true)
                    ->get()
                    ->pluck('teacher')
                    ->unique('id');
    }

    /**
     * Obtenir le nombre total de matières enseignées
     */
    public function getSubjectCount()
    {
        return $this->activeSubjects()->count();
    }
}