<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\Storage;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'original_filename',
        'stored_filename',
        'file_path',
        'file_extension',
        'mime_type',
        'file_size',
        'document_type',
        'folder_id',
        'uploaded_by',
        'student_id',
        'visibility',
        'tags',
        'download_count',
        'last_downloaded_at',
        'is_archived',
        'notes',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_archived' => 'boolean',
        'last_downloaded_at' => 'datetime',
        'file_size' => 'integer',
        'download_count' => 'integer',
    ];

    /**
     * Types de documents disponibles
     */
    const DOCUMENT_TYPES = [
        'general' => 'Général',
        'bulletin' => 'Bulletin',
        'certificat' => 'Certificat',
        'diplome' => 'Diplôme',
        'facture' => 'Facture',
        'recu' => 'Reçu',
        'rapport' => 'Rapport',
        'procedure' => 'Procédure',
        'contrat' => 'Contrat',
        'correspondance' => 'Correspondance',
        'archive' => 'Archive',
    ];

    /**
     * Types de visibilité
     */
    const VISIBILITY_TYPES = [
        'private' => 'Privé',
        'shared' => 'Partagé',
        'public' => 'Public',
    ];

    /**
     * Extensions de fichiers autorisées
     */
    const ALLOWED_EXTENSIONS = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'txt', 'rtf', 'odt', 'ods', 'odp',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
        'zip', 'rar', '7z', 'tar', 'gz',
    ];

    /**
     * Relation avec le dossier
     */
    public function folder(): BelongsTo
    {
        return $this->belongsTo(DocumentFolder::class, 'folder_id');
    }

    /**
     * Relation avec l'utilisateur qui a uploadé
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Relation avec l'étudiant (optionnelle)
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    /**
     * Relation polymorphe avec les permissions
     */
    public function permissions(): MorphMany
    {
        return $this->morphMany(DocumentPermission::class, 'permissionable');
    }

    /**
     * Scope pour les documents visibles par un utilisateur
     */
    public function scopeVisibleBy($query, User $user)
    {
        return $query->where(function ($q) use ($user) {
            // Documents uploadés par l'utilisateur
            $q->where('uploaded_by', $user->id)
                // Ou documents publics
                ->orWhere('visibility', 'public')
                // Ou documents partagés dans des dossiers visibles
                ->orWhere(function ($subQ) use ($user) {
                    $subQ->where('visibility', 'shared')
                        ->whereHas('folder', function ($folderQ) use ($user) {
                            $folderQ->where(function ($visQ) use ($user) {
                                $visQ->where('created_by', $user->id)
                                    ->orWhere(function ($permQ) use ($user) {
                                        $permQ->where('is_private', false)
                                            ->where(function ($roleQ) use ($user) {
                                                $roleQ->whereJsonContains('allowed_roles', $user->role)
                                                    ->orWhereNull('allowed_roles');
                                            });
                                    });
                            });
                        });
                });
        });
    }

    /**
     * Scope pour les documents par type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('document_type', $type);
    }

    /**
     * Scope pour les documents non archivés
     */
    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    /**
     * Scope pour la recherche full-text
     */
    public function scopeSearch($query, $search)
    {
        if (empty($search)) {
            return $query;
        }

        return $query->whereFullText(['title', 'description', 'original_filename'], $search)
                    ->orWhereJsonContains('tags', $search);
    }

    /**
     * Vérifier si l'utilisateur peut voir ce document
     */
    public function isVisibleBy(User $user): bool
    {
        // L'uploader peut toujours voir ses documents
        if ($this->uploaded_by === $user->id) {
            return true;
        }

        // Documents publics
        if ($this->visibility === 'public') {
            return true;
        }

        // Documents privés - seulement l'uploader
        if ($this->visibility === 'private') {
            return false;
        }

        // Documents partagés - vérifier les permissions du dossier
        if ($this->visibility === 'shared') {
            return $this->folder->isVisibleBy($user);
        }

        return false;
    }

    /**
     * Vérifier si l'utilisateur peut télécharger ce document
     */
    public function canDownload(User $user): bool
    {
        return $this->isVisibleBy($user);
    }

    /**
     * Vérifier si l'utilisateur peut modifier ce document
     */
    public function canEdit(User $user): bool
    {
        return $this->uploaded_by === $user->id || $user->role === 'admin';
    }

    /**
     * Vérifier si l'utilisateur peut supprimer ce document
     */
    public function canDelete(User $user): bool
    {
        return $this->uploaded_by === $user->id || $user->role === 'admin';
    }

    /**
     * Obtenir la taille formatée du fichier
     */
    public function getFormattedSizeAttribute(): string
    {
        $size = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        
        return round($size, 2) . ' ' . $units[$i];
    }

    /**
     * Obtenir l'icône du fichier basée sur l'extension
     */
    public function getIconAttribute(): string
    {
        $iconMap = [
            'pdf' => 'file-earmark-pdf',
            'doc' => 'file-earmark-word',
            'docx' => 'file-earmark-word',
            'xls' => 'file-earmark-excel',
            'xlsx' => 'file-earmark-excel',
            'ppt' => 'file-earmark-ppt',
            'pptx' => 'file-earmark-ppt',
            'txt' => 'file-earmark-text',
            'jpg' => 'file-earmark-image',
            'jpeg' => 'file-earmark-image',
            'png' => 'file-earmark-image',
            'gif' => 'file-earmark-image',
            'zip' => 'file-earmark-zip',
            'rar' => 'file-earmark-zip',
            '7z' => 'file-earmark-zip',
        ];

        return $iconMap[$this->file_extension] ?? 'file-earmark';
    }

    /**
     * Incrémenter le compteur de téléchargement
     */
    public function incrementDownloadCount(): void
    {
        $this->increment('download_count');
        $this->update(['last_downloaded_at' => now()]);
    }

    /**
     * Obtenir l'URL de téléchargement
     */
    public function getDownloadUrlAttribute(): string
    {
        return url("/api/documents/{$this->id}/download");
    }

    /**
     * Vérifier si le fichier existe physiquement
     */
    public function fileExists(): bool
    {
        return Storage::disk('local')->exists($this->file_path);
    }

    /**
     * Supprimer le fichier physique
     */
    public function deleteFile(): bool
    {
        if ($this->fileExists()) {
            return Storage::disk('local')->delete($this->file_path);
        }
        return true;
    }
}