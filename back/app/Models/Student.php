<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'date_of_birth',
        'place_of_birth',
        'gender',
        'parent_name',
        'parent_phone',
        'parent_email',
        'address',
        'photo',
        'class_series_id',
        'school_year_id',
        'student_number',
        'order',
        'is_active',
        'has_scholarship_enabled',
        // Anciens champs pour compatibilité
        'name',
        'subname',
        'email',
        'phone_number',
        'birthday',
        'birthday_place',
        'sex',
        'father_name',
        'profession',
        'status',
        'is_new',
        'student_status',
        'registration_fee'
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'birthday' => 'date',
        'is_new' => 'boolean',
        'is_active' => 'boolean',
        'has_scholarship_enabled' => 'boolean'
    ];

    /**
     * Vérifier si l'étudiant est nouveau
     */
    public function isNew()
    {
        return $this->student_status === 'new';
    }

    /**
     * Vérifier si l'étudiant est ancien
     */
    public function isOld()
    {
        return $this->student_status === 'old';
    }

    protected $appends = [
        'full_name',
        'photo_url'
    ];

    /**
     * Relation avec l'année scolaire
     */
    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    /**
     * Relation avec la série de classe
     */
    public function classSeries()
    {
        return $this->belongsTo(ClassSeries::class, 'class_series_id');
    }

    /**
     * Relation avec la classe via la série
     */
    public function schoolClass()
    {
        return $this->hasOneThrough(SchoolClass::class, ClassSeries::class, 'id', 'id', 'class_series_id', 'class_id');
    }

    /**
     * Relation avec les paiements
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Relation avec le statut RAME
     */
    public function rameStatus()
    {
        return $this->hasOne(StudentRameStatus::class);
    }

    /**
     * Scope pour les étudiants actifs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour une année scolaire donnée
     */
    public function scopeForYear($query, $yearId)
    {
        return $query->where('school_year_id', $yearId);
    }

    /**
     * Scope pour une série de classe donnée
     */
    public function scopeForSeries($query, $seriesId)
    {
        return $query->where('class_series_id', $seriesId);
    }

    /**
     * Obtenir le nom complet (format: Nom + Prénom)
     */
    public function getFullNameAttribute()
    {
        if ($this->last_name && $this->first_name) {
            return $this->last_name . ' ' . $this->first_name;
        }
        // Fallback pour compatibilité (inverser aussi pour cohérence)
        if ($this->subname && $this->name) {
            return $this->subname . ' ' . $this->name;
        }
        return $this->name ?: '';
    }

    /**
     * Obtenir l'URL complète de la photo
     */
    public function getPhotoUrlAttribute()
    {
        if ($this->photo) {
            return url('/storage/' . $this->photo);
        }
        return null;
    }

    /**
     * Générer un numéro d'élève unique selon le format: 25A00001
     * Format: [Année][A][Numéro séquentiel sur 5 chiffres]
     */
    public static function generateStudentNumber($year, $seriesId)
    {
        // Extraire les 2 derniers chiffres de l'année
        $currentYear = date('Y');
        $yearSuffix = substr($currentYear, -2); // Ex: "25" pour 2025
        
        // Format du préfixe: AnA (ex: 25A)
        $prefix = $yearSuffix . 'A';
        
        // Chercher le dernier numéro avec ce préfixe
        $lastStudent = self::where('student_number', 'like', $prefix . '%')
                          ->orderBy('student_number', 'desc')
                          ->first();
        
        if ($lastStudent) {
            // Extraire le numéro séquentiel (les 5 derniers chiffres)
            $lastNumber = intval(substr($lastStudent->student_number, -5));
            $newNumber = $lastNumber + 1;
        } else {
            // Premier élève, commencer par 1
            $newNumber = 1;
        }
        
        // Format final: 25A00001
        return $prefix . str_pad($newNumber, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Obtenir le montant d'inscription (les bourses s'appliquent maintenant aux tranches)
     */
    public function getNetRegistrationFee()
    {
        return $this->registration_fee ?? 30000; // Montant standard, les bourses sont appliquées aux tranches
    }
}