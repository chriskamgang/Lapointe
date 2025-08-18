<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class School extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'director_name',
        'director_email',
        'director_phone',
        'is_active',
        'order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer'
    ];

    // Relations

    public function classes()
    {
        return $this->hasManyThrough(
            'App\Models\SchoolClass',
            'App\Models\Level',
            'school_id', // Foreign key on levels table
            'level_id',   // Foreign key on school_classes table  
            'id',         // Local key on sections table
            'id'          // Local key on levels table
        );
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order')->orderBy('name');
    }

    // New methods for statistics and relationships:
    public function universityScholarships()
    {
        return $this->hasMany(UniversityScholarship::class);
    }

    public function universityFees()
    {
        return $this->hasMany(UniversityFee::class);
    }

    public function levels()
    {
        return $this->hasMany(Level::class, 'school_id');
    }

    public function students()
    {
        return $this->hasManyThrough(
            Student::class,
            Level::class,
            'school_id', // Foreign key on levels table
            'class_series_id', // Foreign key on students table (through class_series)
            'id', // Local key on schools table
            'id' // Local key on levels table
        )->join('school_classes', 'levels.id', '=', 'school_classes.level_id')
            ->join('class_series', 'school_classes.id', '=', 'class_series.class_id');
    }

    public function getActiveScholarshipsAttribute()
    {
        return $this->universityScholarships()->active()->get();
    }

    public function getActiveFeesAttribute()
    {
        return $this->universityFees()->active()->get();
    }

    public function getTotalStudentsAttribute()
    {
        return Student::whereHas('classSeries.schoolClass.level', function ($q) {
            $q->where('school_id', $this->id);
        })->where('is_active', true)->count();
    }

    public function getStudentsWithScholarshipsAttribute()
    {
        return Student::whereHas('classSeries.schoolClass.level', function ($q) {
            $q->where('school_id', $this->id);
        })->where('scholarship_amount', '>', 0)->count();
    }

    public function getTotalScholarshipAmountAttribute()
    {
        return Student::whereHas('classSeries.schoolClass.level', function ($q) {
            $q->where('school_id', $this->id);
        })->sum('scholarship_amount');
    }

    public function getLaptopsDistributedAttribute()
    {
        return Student::whereHas('classSeries.schoolClass.level', function ($q) {
            $q->where('school_id', $this->id);
        })->where('laptop_received', true)->count();
    }

    public function getScholarshipRateAttribute()
    {
        $total = $this->total_students;
        if ($total == 0) return 0;
        return round(($this->students_with_scholarships / $total) * 100, 1);
    }
}
