<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class StudentEquipmentStatus extends Model
{
    use HasFactory;

    protected $table = 'student_equipment_status';

    protected $fillable = [
        'student_id',
        'school_year_id',
        'equipment_type',
        'has_paid_for',
        'has_received',
        'brought_physical',
        'paid_date',
        'received_date',
        'notes'
    ];

    protected $casts = [
        'has_paid_for' => 'boolean',
        'has_received' => 'boolean',
        'brought_physical' => 'boolean',
        'paid_date' => 'date',
        'received_date' => 'date'
    ];

    // Relations
    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }

    // Méthodes utilitaires
    public function canReceiveEquipment()
    {
        return $this->has_paid_for && !$this->has_received;
    }

    public function getStatusLabel()
    {
        if (!$this->has_paid_for) {
            return 'Non payé';
        }
        
        if ($this->equipment_type === 'rame' && $this->brought_physical) {
            return 'Rames physiques apportées';
        }
        
        if ($this->has_paid_for && $this->has_received) {
            return 'Payé et reçu';
        }
        
        if ($this->has_paid_for && !$this->has_received) {
            return 'Payé - En attente de distribution';
        }
        
        return 'Statut inconnu';
    }

    public function getStatusClass()
    {
        if (!$this->has_paid_for) {
            return 'text-red-600 bg-red-100';
        }
        
        if ($this->equipment_type === 'rame' && $this->brought_physical) {
            return 'text-blue-600 bg-blue-100';
        }
        
        if ($this->has_paid_for && $this->has_received) {
            return 'text-green-600 bg-green-100';
        }
        
        if ($this->has_paid_for && !$this->has_received) {
            return 'text-orange-600 bg-orange-100';
        }
        
        return 'text-gray-600 bg-gray-100';
    }

    // Scopes
    public function scopeForStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeForYear($query, $yearId)
    {
        return $query->where('school_year_id', $yearId);
    }

    public function scopeByEquipmentType($query, $type)
    {
        return $query->where('equipment_type', $type);
    }

    public function scopePaidFor($query)
    {
        return $query->where('has_paid_for', true);
    }

    public function scopeReceived($query)
    {
        return $query->where('has_received', true);
    }

    public function scopePendingDelivery($query)
    {
        return $query->where('has_paid_for', true)->where('has_received', false);
    }

    public function scopePhysicalRames($query)
    {
        return $query->where('equipment_type', 'rame')->where('brought_physical', true);
    }
}