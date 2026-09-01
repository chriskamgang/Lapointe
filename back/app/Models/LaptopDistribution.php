<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LaptopDistribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'laptop_model',
        'serial_number',
        'distribution_date',
        'return_date',
        'status',
        'notes'
    ];

    protected $casts = [
        'distribution_date' => 'date',
        'return_date' => 'date'
    ];

    // Relations
    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    // Scopes
    public function scopeDistributed($query)
    {
        return $query->where('status', 'distributed');
    }

    public function scopeReturned($query)
    {
        return $query->where('status', 'returned');
    }

    // Accessors
    public function getIsActiveAttribute()
    {
        return in_array($this->status, ['distributed']);
    }
}