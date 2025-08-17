<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolSetting extends Model
{
    protected $fillable = [
        'school_name',
        'school_motto',
        'school_address',
        'school_phone',
        'school_email',
        'school_website',
        'school_logo',
        'currency',
        'bank_name',
        'country',
        'city',
        'footer_text',
        'scholarship_deadline',
        'reduction_percentage',
        'primary_color',
        'whatsapp_notification_number',
        'whatsapp_notifications_enabled',
        'whatsapp_api_url',
        'whatsapp_instance_id',
        'whatsapp_token'
    ];

    protected $casts = [
        'scholarship_deadline' => 'date',
        'reduction_percentage' => 'decimal:2',
        'whatsapp_notifications_enabled' => 'boolean'
    ];

    /**
     * Obtenir les paramètres de l'école (singleton)
     */
    public static function getSettings()
    {
        return self::first() ?? self::create([
            'school_name' => 'COLLÈGE POLYVALENT BILINGUE DE DOUALA',
            'currency' => 'FCFA',
            'reduction_percentage' => 10.00,
            'primary_color' => '#007bff'
        ]);
    }

    /**
     * Vérifier si la date limite pour les bourses est dépassée
     */
    public function isScholarshipDeadlinePassed()
    {
        return $this->scholarship_deadline && now()->isAfter($this->scholarship_deadline);
    }
}
