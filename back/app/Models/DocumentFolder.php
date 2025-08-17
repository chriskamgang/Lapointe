<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class DocumentFolder extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'folder_type',
        'color',
        'icon',
        'parent_folder_id',
        'created_by',
        'is_system_folder',
        'is_private',
        'allowed_roles',
        'sort_order',
    ];

    protected $casts = [
        'allowed_roles' => 'array',
        'is_system_folder' => 'boolean',
        'is_private' => 'boolean',
    ];

    /**
     * Types de dossiers disponibles
     */
    const FOLDER_TYPES = [
        'custom' => 'Personnalisé',
        'student' => 'Étudiant',
        'administration' => 'Administration',
    ];

    /**
     * Relation avec l'utilisateur créateur
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relation avec le dossier parent
     */
    public function parentFolder(): BelongsTo
    {
        return $this->belongsTo(DocumentFolder::class, 'parent_folder_id');
    }

    /**
     * Relation avec les sous-dossiers
     */
    public function subFolders(): HasMany
    {
        return $this->hasMany(DocumentFolder::class, 'parent_folder_id');
    }

    /**
     * Relation avec les documents
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'folder_id');
    }

    /**
     * Relation polymorphe avec les permissions
     */
    public function permissions(): MorphMany
    {
        return $this->morphMany(DocumentPermission::class, 'permissionable');
    }

    /**
     * Scope pour les dossiers racines (sans parent)
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_folder_id');
    }

    /**
     * Scope pour les dossiers par type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('folder_type', $type);
    }

    /**
     * Scope pour les dossiers visibles par un utilisateur
     */
    public function scopeVisibleBy($query, User $user)
    {
        return $query->where(function ($q) use ($user) {
            // Dossiers créés par l'utilisateur
            $q->where('created_by', $user->id)
                // Ou dossiers non privés avec rôles autorisés
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('is_private', false)
                        ->where(function ($roleQ) use ($user) {
                            $roleQ->whereJsonContains('allowed_roles', $user->role)
                                ->orWhereNull('allowed_roles');
                        });
                });
        });
    }

    /**
     * Vérifier si un utilisateur peut voir ce dossier
     */
    public function isVisibleBy(User $user): bool
    {
        // Le créateur peut toujours voir ses dossiers
        if ($this->created_by === $user->id) {
            return true;
        }

        // Si le dossier est privé, seul le créateur peut le voir
        if ($this->is_private) {
            return false;
        }

        // Si pas de rôles spécifiés, visible par tous
        if (empty($this->allowed_roles)) {
            return true;
        }

        // Vérifier si le rôle de l'utilisateur est autorisé
        return in_array($user->role, $this->allowed_roles);
    }

    /**
     * Obtenir le chemin complet du dossier
     */
    public function getFullPathAttribute(): string
    {
        $path = [];
        $folder = $this;
        
        while ($folder) {
            array_unshift($path, $folder->name);
            $folder = $folder->parentFolder;
        }
        
        return implode(' / ', $path);
    }

    /**
     * Obtenir le nombre total de documents dans ce dossier et ses sous-dossiers
     */
    public function getTotalDocumentsCount(): int
    {
        $count = $this->documents()->count();
        
        foreach ($this->subFolders as $subFolder) {
            $count += $subFolder->getTotalDocumentsCount();
        }
        
        return $count;
    }

    /**
     * Vérifier si l'utilisateur peut créer des documents dans ce dossier
     */
    public function canCreateDocuments(User $user): bool
    {
        return $this->isVisibleBy($user) && !$this->is_system_folder;
    }
}