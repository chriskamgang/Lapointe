<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeriesSubject extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_class_id',
        'subject_id',
        'coefficient',
        'is_active'
    ];

    protected $casts = [
        'coefficient' => 'decimal:1',
        'is_active' => 'boolean'
    ];

    /**
     * Relation avec la classe/série
     */
    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }

    /**
     * Relation avec la matière
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Relation avec les affectations d'enseignants
     */
    public function teacherAssignments()
    {
        return $this->hasMany(TeacherAssignment::class);
    }

    /**
     * Obtenir les enseignants affectés à cette matière dans cette série
     */
    public function teachers()
    {
        return $this->belongsToMany(Teacher::class, 'teacher_assignments')
                    ->withPivot(['school_year_id', 'is_active'])
                    ->withTimestamps();
    }
}