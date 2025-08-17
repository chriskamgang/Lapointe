<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer'
    ];

    // Relations
    public function levels()
    {
        return $this->hasMany(Level::class);
    }
    
    public function classes()
    {
        return $this->hasManyThrough(
            'App\Models\SchoolClass',
            'App\Models\Level',
            'section_id', // Foreign key on levels table
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
}
