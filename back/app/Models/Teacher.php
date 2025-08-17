<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Teacher extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'phone_number',
        'email',
        'address',
        'date_of_birth',
        'gender',
        'qualification',
        'hire_date',
        'is_active',
        'user_id',
        'qr_code',
        'expected_arrival_time',
        'expected_departure_time',
        'daily_work_hours'
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'hire_date' => 'date',
        'is_active' => 'boolean',
        'expected_arrival_time' => 'datetime:H:i',
        'expected_departure_time' => 'datetime:H:i',
        'daily_work_hours' => 'decimal:2'
    ];

    protected $appends = [
        'full_name'
    ];

    /**
     * Relation avec le compte utilisateur
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation avec les matières enseignées
     */
    public function subjects()
    {
        return $this->belongsToMany(Subject::class, 'teacher_subjects')
                    ->withPivot('class_series_id', 'school_year_id', 'is_active')
                    ->withTimestamps();
    }

    /**
     * Relation avec les assignations enseignant-matière
     */
    public function teacherSubjects()
    {
        return $this->hasMany(TeacherSubject::class);
    }

    /**
     * Relation avec les classes où l'enseignant est professeur principal
     */
    public function mainClasses()
    {
        return $this->hasMany(ClassSeries::class, 'main_teacher_id');
    }

    /**
     * Obtenir le nom complet
     */
    public function getFullNameAttribute()
    {
        return $this->last_name . ' ' . $this->first_name;
    }

    /**
     * Scope pour les enseignants actifs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Obtenir les matières enseignées pour une année donnée
     */
    public function getSubjectsForYear($yearId)
    {
        return $this->subjects()
                    ->wherePivot('school_year_id', $yearId)
                    ->wherePivot('is_active', true)
                    ->get();
    }

    /**
     * Obtenir les classes enseignées pour une année donnée
     */
    public function getClassSeriesForYear($yearId)
    {
        return $this->teacherSubjects()
                    ->with(['classSeries', 'subject'])
                    ->where('school_year_id', $yearId)
                    ->where('is_active', true)
                    ->get()
                    ->pluck('classSeries')
                    ->unique('id');
    }

    /**
     * Vérifier si l'enseignant enseigne une matière dans une série pour une année
     */
    public function teachesSubjectInSeries($subjectId, $seriesId, $yearId)
    {
        return $this->teacherSubjects()
                    ->where('subject_id', $subjectId)
                    ->where('class_series_id', $seriesId)
                    ->where('school_year_id', $yearId)
                    ->where('is_active', true)
                    ->exists();
    }

    /**
     * Vérifier si l'enseignant est professeur principal d'une classe
     */
    public function isMainTeacherOf($seriesId)
    {
        return $this->mainClasses()->where('id', $seriesId)->exists();
    }

    /**
     * Obtenir le nombre de matières enseignées pour une année
     */
    public function getSubjectCountForYear($yearId)
    {
        return $this->teacherSubjects()
                    ->where('school_year_id', $yearId)
                    ->where('is_active', true)
                    ->distinct('subject_id')
                    ->count();
    }

    /**
     * Obtenir le nombre de classes enseignées pour une année
     */
    public function getClassCountForYear($yearId)
    {
        return $this->teacherSubjects()
                    ->where('school_year_id', $yearId)
                    ->where('is_active', true)
                    ->distinct('class_series_id')  
                    ->count();
    }

    /**
     * Relation avec les présences de l'enseignant
     */
    public function attendances()
    {
        return $this->hasMany(TeacherAttendance::class);
    }

    /**
     * Générer un QR code unique pour l'enseignant
     */
    public function generateQRCode()
    {
        if (!$this->qr_code) {
            $qrCode = 'TCH_' . strtoupper(\Illuminate\Support\Str::random(8)) . '_' . $this->id;
            $this->update(['qr_code' => $qrCode]);
        }
        return $this->qr_code;
    }

    /**
     * Obtenir les statistiques de présence pour une période
     */
    public function getAttendanceStats($startDate, $endDate)
    {
        return TeacherAttendance::getTeacherStats($this->id, $startDate, $endDate);
    }

    /**
     * Vérifier si l'enseignant est actuellement présent
     */
    public function isCurrentlyPresent()
    {
        $today = now()->toDateString();
        $lastEntry = $this->attendances()
            ->whereDate('attendance_date', $today)
            ->where('event_type', 'entry')
            ->latest('scanned_at')
            ->first();

        $lastExit = $this->attendances()
            ->whereDate('attendance_date', $today)
            ->where('event_type', 'exit')
            ->latest('scanned_at')
            ->first();

        // Présent si : entrée sans sortie OU dernière entrée après dernière sortie
        return $lastEntry && (!$lastExit || $lastEntry->scanned_at > $lastExit->scanned_at);
    }

    /**
     * Obtenir l'heure d'arrivée aujourd'hui
     */
    public function getTodayArrivalTime()
    {
        return $this->attendances()
            ->whereDate('attendance_date', now()->toDateString())
            ->where('event_type', 'entry')
            ->latest('scanned_at')
            ->first()?->scanned_at;
    }

    /**
     * Obtenir l'heure de départ aujourd'hui
     */
    public function getTodayDepartureTime()
    {
        return $this->attendances()
            ->whereDate('attendance_date', now()->toDateString())
            ->where('event_type', 'exit')
            ->latest('scanned_at')
            ->first()?->scanned_at;
    }
}