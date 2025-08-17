<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentFolder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    /**
     * Lister les documents accessibles à l'utilisateur
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $query = Document::with(['folder', 'uploader', 'student'])
                            ->visibleBy($user)
                            ->active()
                            ->orderBy('created_at', 'desc');

            // Filtres
            if ($request->has('folder_id') && $request->folder_id) {
                $query->where('folder_id', $request->folder_id);
            }

            if ($request->has('document_type') && $request->document_type) {
                $query->byType($request->document_type);
            }

            if ($request->has('search') && $request->search) {
                $query->search($request->search);
            }

            if ($request->has('student_id') && $request->student_id) {
                $query->where('student_id', $request->student_id);
            }

            $documents = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $documents
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des documents',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un document spécifique
     */
    public function show(Document $document)
    {
        try {
            $user = Auth::user();

            if (!$document->isVisibleBy($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé à ce document'
                ], 403);
            }

            $document->load(['folder', 'uploader', 'student']);

            return response()->json([
                'success' => true,
                'data' => $document
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Uploader un nouveau document
     */
    public function store(Request $request)
    {
        try {
            // Debug: log des données reçues
            \Log::info('Document upload request received', [
                'request_data' => $request->all(),
                'files' => $request->file() ? array_keys($request->file()) : 'no files',
                'user_id' => auth()->id()
            ]);
            
            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string|max:2000',
                'folder_id' => 'required|exists:document_folders,id',
                'document_type' => 'required|string|in:' . implode(',', array_keys(Document::DOCUMENT_TYPES)),
                'visibility' => 'required|string|in:' . implode(',', array_keys(Document::VISIBILITY_TYPES)),
                'student_id' => 'nullable|exists:students,id',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'file' => 'required|file|mimes:' . implode(',', Document::ALLOWED_EXTENSIONS) . '|max:10240', // 10MB max
                'notes' => 'nullable|string|max:1000'
            ], [
                'title.required' => 'Le titre est obligatoire',
                'folder_id.required' => 'Le dossier est obligatoire',
                'folder_id.exists' => 'Le dossier sélectionné n\'existe pas',
                'document_type.required' => 'Le type de document est obligatoire',
                'visibility.required' => 'La visibilité est obligatoire',
                'file.required' => 'Le fichier est obligatoire',
                'file.mimes' => 'Type de fichier non autorisé',
                'file.max' => 'Le fichier ne peut pas dépasser 10MB'
            ]);

            if ($validator->fails()) {
                \Log::warning('Document upload validation failed', [
                    'errors' => $validator->errors()->toArray(),
                    'request_data' => $request->all()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $folder = DocumentFolder::findOrFail($request->folder_id);

            // Vérifier les permissions sur le dossier
            if (!$folder->isVisibleBy($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas l\'autorisation d\'ajouter des documents à ce dossier'
                ], 403);
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());
            $mimeType = $file->getMimeType();
            $size = $file->getSize();

            // Générer un nom de fichier unique
            $storedName = Str::random(40) . '.' . $extension;
            $relativePath = 'documents/' . date('Y/m/');
            
            // Créer le répertoire s'il n'existe pas
            Storage::makeDirectory('public/' . $relativePath);
            
            $fullPath = $relativePath . $storedName;

            // Sauvegarder le fichier
            $file->storeAs('public/' . $relativePath, $storedName);

            // Créer l'enregistrement en base de données
            $document = Document::create([
                'title' => $request->title,
                'description' => $request->description,
                'original_filename' => $originalName,
                'stored_filename' => $storedName,
                'file_path' => 'public/' . $fullPath,
                'file_extension' => $extension,
                'mime_type' => $mimeType,
                'file_size' => $size,
                'document_type' => $request->document_type,
                'folder_id' => $request->folder_id,
                'uploaded_by' => $user->id,
                'student_id' => $request->student_id,
                'visibility' => $request->visibility,
                'tags' => $request->tags ?? [],
                'notes' => $request->notes
            ]);

            $document->load(['folder', 'uploader', 'student']);

            return response()->json([
                'success' => true,
                'message' => 'Document uploadé avec succès',
                'data' => $document
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload du document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un document
     */
    public function update(Request $request, Document $document)
    {
        try {
            $user = Auth::user();

            if (!$document->canEdit($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas l\'autorisation de modifier ce document'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string|max:2000',
                'document_type' => 'required|string|in:' . implode(',', array_keys(Document::DOCUMENT_TYPES)),
                'visibility' => 'required|string|in:' . implode(',', array_keys(Document::VISIBILITY_TYPES)),
                'student_id' => 'nullable|exists:students,id',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'notes' => 'nullable|string|max:1000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $document->update($request->only([
                'title', 'description', 'document_type', 'visibility',
                'student_id', 'tags', 'notes'
            ]));

            $document->load(['folder', 'uploader', 'student']);

            return response()->json([
                'success' => true,
                'message' => 'Document mis à jour avec succès',
                'data' => $document
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un document
     */
    public function destroy(Document $document)
    {
        try {
            $user = Auth::user();

            if (!$document->canDelete($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas l\'autorisation de supprimer ce document'
                ], 403);
            }

            // Supprimer le fichier physique
            $document->deleteFile();

            // Supprimer l'enregistrement
            $document->delete();

            return response()->json([
                'success' => true,
                'message' => 'Document supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Télécharger un document
     */
    public function download(Document $document)
    {
        try {
            $user = Auth::user();

            if (!$document->canDownload($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas l\'autorisation de télécharger ce document'
                ], 403);
            }

            if (!$document->fileExists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le fichier n\'existe plus sur le serveur'
                ], 404);
            }

            // Incrémenter le compteur de téléchargement
            $document->incrementDownloadCount();

            // Retourner le fichier en streaming
            return Storage::download($document->file_path, $document->original_filename, [
                'Content-Type' => $document->mime_type,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du téléchargement du document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques des documents
     */
    public function statistics()
    {
        try {
            $user = Auth::user();

            $stats = [
                'total_documents' => Document::visibleBy($user)->count(),
                'my_documents' => Document::where('uploaded_by', $user->id)->count(),
                'by_type' => [],
                'by_folder' => [],
                'recent_uploads' => Document::visibleBy($user)
                                         ->with(['uploader'])
                                         ->latest()
                                         ->take(10)
                                         ->get(),
                'most_downloaded' => Document::visibleBy($user)
                                           ->with(['uploader'])
                                           ->orderBy('download_count', 'desc')
                                           ->take(10)
                                           ->get(),
            ];

            // Statistiques par type
            foreach (Document::DOCUMENT_TYPES as $type => $label) {
                $stats['by_type'][$type] = [
                    'label' => $label,
                    'count' => Document::visibleBy($user)->byType($type)->count()
                ];
            }

            // Statistiques par dossier
            $folders = DocumentFolder::visibleBy($user)->with('documents')->get();
            foreach ($folders as $folder) {
                $stats['by_folder'][] = [
                    'folder_name' => $folder->name,
                    'count' => $folder->documents()->visibleBy($user)->count()
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Archiver/désarchiver un document
     */
    public function toggleArchive(Document $document)
    {
        try {
            $user = Auth::user();

            if (!$document->canEdit($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas l\'autorisation de modifier ce document'
                ], 403);
            }

            $document->update(['is_archived' => !$document->is_archived]);

            return response()->json([
                'success' => true,
                'message' => $document->is_archived ? 'Document archivé' : 'Document désarchivé',
                'data' => $document
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'archivage du document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les types de documents disponibles
     */
    public function getDocumentTypes()
    {
        return response()->json([
            'success' => true,
            'data' => Document::DOCUMENT_TYPES
        ]);
    }

    /**
     * Obtenir les types de documents disponibles
     */
    public function getTypes()
    {
        return response()->json([
            'success' => true,
            'data' => Document::DOCUMENT_TYPES
        ]);
    }

    /**
     * Obtenir les types de visibilité disponibles
     */
    public function getVisibilityTypes()
    {
        return response()->json([
            'success' => true,
            'data' => Document::VISIBILITY_TYPES
        ]);
    }
}