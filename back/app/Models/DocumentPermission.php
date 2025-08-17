<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DocumentPermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'permissionable_type',
        'permissionable_id',
        'user_id',
        'permission_type',
        'granted_at',
        'granted_by',
        'expires_at',
    ];

    protected $casts = [
        'granted_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * Types de permissions disponibles
     */
    const PERMISSION_TYPES = [
        'view' => 'Voir',
        'download' => 'Télécharger',
        'edit' => 'Modifier',
        'delete' => 'Supprimer',
    ];

    /**
     * Relation polymorphe avec l'objet (document ou dossier)
     */
    public function permissionable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Relation avec l'utilisateur qui a la permission
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation avec l'utilisateur qui a accordé la permission
     */
    public function grantedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by');
    }

    /**
     * Scope pour les permissions actives (non expirées)
     */
    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    /**
     * Scope pour les permissions par type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('permission_type', $type);
    }

    /**
     * Vérifier si la permission est encore valide
     */
    public function isValid(): bool
    {
        return is_null($this->expires_at) || $this->expires_at > now();
    }

    /**
     * Vérifier si la permission expire bientôt (dans les 7 jours)
     */
    public function expiresSoon(): bool
    {
        if (is_null($this->expires_at)) {
            return false;
        }

        return $this->expires_at <= now()->addDays(7);
    }
}