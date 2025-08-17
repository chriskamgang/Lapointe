<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'supervisor_id',
        'school_class_id',
        'school_year_id',
        'attendance_date',
        'scanned_at',
        'is_present',
        'event_type',
        'parent_notified',
        'notified_at',
        'notes'
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'scanned_at' => 'datetime:H:i',
        'is_present' => 'boolean',
        'parent_notified' => 'boolean',
        'notified_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('attendance_date', $date);
    }

    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('attendance_date', [$startDate, $endDate]);
    }

    public function scopeForClass($query, $classId)
    {
        return $query->where('school_class_id', $classId);
    }

    public function scopeForSupervisor($query, $supervisorId)
    {
        return $query->where('supervisor_id', $supervisorId);
    }

    public function scopePresent($query)
    {
        return $query->where('is_present', true);
    }

    public function scopeAbsent($query)
    {
        return $query->where('is_present', false);
    }

    public function scopeForSchoolYear($query, $schoolYearId)
    {
        return $query->where('school_year_id', $schoolYearId);
    }

    public function scopeEntries($query)
    {
        return $query->where('event_type', 'entry');
    }

    public function scopeExits($query)
    {
        return $query->where('event_type', 'exit');
    }

    public function scopeNotNotified($query)
    {
        return $query->where('parent_notified', false);
    }
}