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
        'phone',
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
        'registration_fee',
        'has_payments',
        'last_payment_date',
        'bts_mention', // Pour ESGIT Licence Pro
        'current_level', // Niveau actuel de l'étudiant (1, 2, 3, etc.)
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'birthday' => 'date',
        'is_new' => 'boolean',
        'is_active' => 'boolean',
        'has_scholarship_enabled' => 'boolean',
         'has_payments' => 'boolean',
        'last_payment_date' => 'datetime',
        'current_level' => 'integer',
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
     * Générer un numéro d'étudiant unique selon le format: 25A00001
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
            // Premier étudiant, commencer par 1
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

    /**
     * Relation avec les statuts d'équipements
     */
    public function equipmentStatuses()
    {
        return $this->hasMany(StudentEquipmentStatus::class);
    }

    /**
     * Obtenir le statut d'équipement pour une année et un type donnés
     */
    public function getEquipmentStatus($schoolYearId, $equipmentType)
    {
        return $this->equipmentStatuses()
            ->where('school_year_id', $schoolYearId)
            ->where('equipment_type', $equipmentType)
            ->first();
    }

    /**
     * Vérifier si l'étudiant a payé pour un équipement
     */
    public function hasPaidForEquipment($schoolYearId, $equipmentType)
    {
        $status = $this->getEquipmentStatus($schoolYearId, $equipmentType);
        return $status ? $status->has_paid_for : false;
    }

    /**
     * Vérifier si l'étudiant a reçu un équipement
     */
    public function hasReceivedEquipment($schoolYearId, $equipmentType)
    {
        $status = $this->getEquipmentStatus($schoolYearId, $equipmentType);
        return $status ? $status->has_received : false;
    }

    /**
     * Obtenir tous les équipements en attente de distribution
     */
    public function getPendingEquipments($schoolYearId)
    {
        return $this->equipmentStatuses()
            ->where('school_year_id', $schoolYearId)
            ->where('has_paid_for', true)
            ->where('has_received', false)
            ->get();
    }

    /**
     * Vérifier l'éligibilité aux bourses
     */
    public function isEligibleForScholarship()
    {
        // Vérifier que l'étudiant a activé les bourses
        if (!$this->has_scholarship_enabled) {
            return false;
        }

        if (!$this->classSeries || !$this->classSeries->schoolClass) {
            return false;
        }

        $schoolCode = $this->classSeries->schoolClass->level->school->code;
        $levelType = $this->classSeries->schoolClass->level->level_type;

        // Logique d'éligibilité selon les règles définies
        switch ($schoolCode) {
            case 'INSSAS':
                return in_array($levelType, ['BTS', 'HND', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO', 'MASTER_PRO']);
                
            case 'ESGIT':
                return in_array($levelType, ['LICENCE_PRO', 'INGENIERIE']);
                
            case 'ESSIT':
                return $levelType === 'INGENIERIE_SC';
                
            case 'ISTPM':
                return in_array($levelType, ['CQP', 'DQP']);
                
            default:
                return false;
        }
    }

    /**
     * Calculer le montant de bourse auquel l'étudiant a droit
     */
    public function calculateScholarshipAmount()
    {
        if (!$this->isEligibleForScholarship()) {
            return 0;
        }

        $schoolCode = $this->classSeries->schoolClass->level->school->code;
        $levelType = $this->classSeries->schoolClass->level->level_type;
        $currentLevel = $this->current_level ?? 1;

        switch ($schoolCode) {
            case 'INSSAS':
                if (in_array($levelType, ['BTS', 'HND'])) {
                    return $currentLevel === 1 ? 50000 : 100000;
                }
                if ($levelType === 'DOUBLE_DIPLOMATION') {
                    return $currentLevel === 1 ? 50000 : 100000;
                }
                if ($levelType === 'LICENCE_PRO') {
                    return 100000;
                }
                if ($levelType === 'MASTER_PRO') {
                    return $currentLevel <= 2 ? 150000 : 0;
                }
                break;

            case 'ESGIT':
                if ($levelType === 'LICENCE_PRO') {
                    // Bourses selon mention BTS
                    $scholarships = [
                        'passable' => 50000,
                        'assez_bien' => 100000,
                        'bien' => 120000,
                        'tres_bien' => 150000
                    ];
                    return $scholarships[$this->bts_mention ?? 'passable'];
                }
                if ($levelType === 'INGENIERIE') {
                    return 50000; // 3ème année
                }
                break;

            case 'ESSIT':
                if ($levelType === 'INGENIERIE_SC') {
                    return 50000; // Niveaux 3, 4, 5
                }
                break;

            case 'ISTPM':
                return 25000; // CQP et DQP
                break;
        }

        return 0;
    }

    /**
     * Obtenir les équipements requis pour cet étudiant
     */
    public function getRequiredEquipments()
    {
        if (!$this->classSeries || !$this->classSeries->schoolClass) {
            return [];
        }

        $schoolCode = $this->classSeries->schoolClass->level->school->code;
        $levelType = $this->classSeries->schoolClass->level->level_type;
        $specialityCode = $this->classSeries->schoolClass->speciality_code;

        $equipment = [
            'polo' => false,
            'blouse' => false,
            'laptop' => false,
            'rame' => true // Par défaut toutes les écoles sauf ISTMS
        ];

        // Cas spécial ISTMS - pas de rames
        if ($schoolCode === 'ISTMS') {
            $equipment['rame'] = false;
            $equipment['blouse'] = true;
            return $equipment;
        }

        // INSSAS : Toujours blouses pour filières santé
        if ($schoolCode === 'INSSAS') {
            $equipment['blouse'] = true;
            $equipment['laptop'] = in_array($levelType, ['LICENCE_ACA', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO']);
            return $equipment;
        }

        // ESGIT : Toujours polos et laptops
        if ($schoolCode === 'ESGIT') {
            $equipment['polo'] = true;
            $equipment['laptop'] = true;
            return $equipment;
        }

        // ESJEC : Polos et laptops pour BTS seulement
        if ($schoolCode === 'ESJEC') {
            $equipment['polo'] = true;
            $equipment['laptop'] = ($levelType === 'BTS');
            return $equipment;
        }

        // ESSIT : Polos et laptops
        if ($schoolCode === 'ESSIT') {
            $equipment['polo'] = true;
            $equipment['laptop'] = true;
            return $equipment;
        }

        // ISTPM : Blouse pour filières santé, polo pour autres
        if ($schoolCode === 'ISTPM') {
            $healthSpecialties = ['Technicien Adjoint de Laboratoire', 'Auxiliaire de Puériculture', 'Assistant en Cabinet Médical', 'Auxiliaire de Vie', 'Massothérapie', 'Délégué Médical', 'Vendeur en Pharmacie', 'Secrétariat Médical'];
            
            $isHealthSpecialty = false;
            foreach ($healthSpecialties as $specialty) {
                if (stripos($specialityCode, $specialty) !== false || 
                    stripos($this->classSeries->schoolClass->name, $specialty) !== false) {
                    $isHealthSpecialty = true;
                    break;
                }
            }
            
            $equipment['blouse'] = $isHealthSpecialty;
            $equipment['polo'] = !$isHealthSpecialty;
            return $equipment;
        }

        return $equipment;
    }

    /**
     * Vérifier si l'étudiant peut recevoir un équipement spécifique
     */
    public function canReceiveEquipment($schoolYearId, $equipmentType)
    {
        $requiredEquipments = $this->getRequiredEquipments();
        
        // L'équipement doit être requis
        if (!isset($requiredEquipments[$equipmentType]) || !$requiredEquipments[$equipmentType]) {
            return false;
        }

        // L'étudiant doit avoir payé pour cet équipement
        $status = $this->getEquipmentStatus($schoolYearId, $equipmentType);
        if (!$status || !$status->has_paid_for) {
            return false;
        }

        // L'étudiant ne doit pas avoir déjà reçu l'équipement
        if ($status->has_received) {
            return false;
        }

        return true;
    }

    /**
     * Scope pour les étudiants avec équipements en attente
     */
    public function scopeWithPendingEquipments($query, $schoolYearId, $equipmentType = null)
    {
        return $query->whereHas('equipmentStatuses', function ($q) use ($schoolYearId, $equipmentType) {
            $q->where('school_year_id', $schoolYearId)
              ->where('has_paid_for', true)
              ->where('has_received', false);
              
            if ($equipmentType) {
                $q->where('equipment_type', $equipmentType);
            }
        });
    }

    /**
     * Scope pour les étudiants éligibles aux bourses
     */
    public function scopeEligibleForScholarships($query)
    {
        return $query->whereHas('classSeries.schoolClass.level.school', function ($q) {
            $q->whereIn('code', ['INSSAS', 'ESGIT', 'ESSIT', 'ISTPM']);
        });
    }
}