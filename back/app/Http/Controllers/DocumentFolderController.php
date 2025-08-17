<?php

namespace App\Http\Controllers;

use App\Models\DocumentFolder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class DocumentFolderController extends Controller
{
    /**
     * Lister les dossiers accessibles à l'utilisateur
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $query = DocumentFolder::with(['creator', 'parentFolder', 'subFolders', 'documents'])
                                  ->visibleBy($user)
                                  ->orderBy('sort_order')
                                  ->orderBy('name');

            // Filtrer par type de dossier
            if ($request->has('folder_type') && $request->folder_type) {
                $query->byType($request->folder_type);
            }

            // Filtrer par dossiers racines uniquement
            if ($request->boolean('roots_only')) {
                $query->roots();
            }

            $folders = $query->get();

            // Ajouter le nombre de documents pour chaque dossier
            foreach ($folders as $folder) {
                $folder->total_documents = $folder->getTotalDocumentsCount();
            }

            return response()->json([
                'success' => true,
                'data' => $folders
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des dossiers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un dossier spécifique
     */
    public function show(DocumentFolder $documentFolder)
    {
        try {
            $user = Auth::user();

            if (!$documentFolder->isVisibleBy($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé à ce dossier'
                ], 403);
            }

            $documentFolder->load(['creator', 'parentFolder', 'subFolders', 'documents.uploader']);
            $documentFolder->total_documents = $documentFolder->getTotalDocumentsCount();

            return response()->json([
                'success' => true,
                'data' => $documentFolder
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du dossier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer un nouveau dossier
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:2000',
                'folder_type' => 'required|string|in:' . implode(',', array_keys(DocumentFolder::FOLDER_TYPES)),
                'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'icon' => 'nullable|string|max:50',
                'parent_folder_id' => 'nullable|exists:document_folders,id',
                'is_private' => 'boolean',
                'allowed_roles' => 'nullable|array',
                'allowed_roles.*' => 'string|in:admin,accountant,teacher,surveillant_general',
                'sort_order' => 'nullable|integer|min:0'
            ], [
                'name.required' => 'Le nom du dossier est obligatoire',
                'folder_type.required' => 'Le type de dossier est obligatoire',
                'folder_type.in' => 'Type de dossier invalide',
                'color.regex' => 'La couleur doit être au format hexadécimal (#RRGGBB)',
                'parent_folder_id.exists' => 'Le dossier parent sélectionné n\'existe pas'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();

            // Vérifier les permissions sur le dossier parent
            if ($request->parent_folder_id) {
                $parentFolder = DocumentFolder::findOrFail($request->parent_folder_id);
                if (!$parentFolder->isVisibleBy($user)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Vous n\'avez pas l\'autorisation de créer un sous-dossier dans ce dossier'
                    ], 403);
                }
            }

            $folder = DocumentFolder::create([
                'name' => $request->name,
                'description' => $request->description,
                'folder_type' => $request->folder_type,
                'color' => $request->color ?? '#007bff',
                'icon' => $request->icon ?? 'folder',
                'parent_folder_id' => $request->parent_folder_id,
                'created_by' => $user->id,
                'is_private' => $request->boolean('is_private'),
                'allowed_roles' => $request->allowed_roles,
                'sort_order' => $request->sort_order ?? 0,
            ]);

            $folder->load(['creator', 'parentFolder']);

            return response()->json([
                'success' => true,
                'message' => 'Dossier créé avec succès',
                'data' => $folder
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du dossier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un dossier
     */
    public function update(Request $request, DocumentFolder $documentFolder)
    {
        try {
            $user = Auth::user();

            // Vérifier les permissions (seul le créateur ou admin peut modifier)
            if ($documentFolder->created_by !== $user->id && $user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas l\'autorisation de modifier ce dossier'
                ], 403);
            }

            // Empêcher la modification des dossiers système
            if ($documentFolder->is_system_folder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Les dossiers système ne peuvent pas être modifiés'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:2000',
                'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'icon' => 'nullable|string|max:50',
                'is_private' => 'boolean',
                'allowed_roles' => 'nullable|array',
                'allowed_roles.*' => 'string|in:admin,accountant,teacher,surveillant_general',
                'sort_order' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $documentFolder->update($request->only([
                'name', 'description', 'color', 'icon', 
                'is_private', 'allowed_roles', 'sort_order'
            ]));

            $documentFolder->load(['creator', 'parentFolder']);

            return response()->json([
                'success' => true,
                'message' => 'Dossier mis à jour avec succès',
                'data' => $documentFolder
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du dossier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un dossier
     */
    public function destroy(DocumentFolder $documentFolder)
    {
        try {
            $user = Auth::user();

            // Vérifier les permissions (seul le créateur ou admin peut supprimer)
            if ($documentFolder->created_by !== $user->id && $user->role !== 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas l\'autorisation de supprimer ce dossier'
                ], 403);
            }

            // Empêcher la suppression des dossiers système
            if ($documentFolder->is_system_folder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Les dossiers système ne peuvent pas être supprimés'
                ], 422);
            }

            // Vérifier que le dossier est vide
            if ($documentFolder->documents()->count() > 0 || $documentFolder->subFolders()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer un dossier qui contient des documents ou des sous-dossiers'
                ], 422);
            }

            $documentFolder->delete();

            return response()->json([
                'success' => true,
                'message' => 'Dossier supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du dossier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir l'arborescence des dossiers
     */
    public function getTree()
    {
        try {
            $user = Auth::user();
            
            $folders = DocumentFolder::with(['subFolders', 'documents'])
                                   ->visibleBy($user)
                                   ->roots()
                                   ->orderBy('sort_order')
                                   ->orderBy('name')
                                   ->get();

            $tree = $this->buildTree($folders, $user);

            return response()->json([
                'success' => true,
                'data' => $tree
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'arborescence',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Construire l'arborescence récursivement
     */
    private function buildTree($folders, $user, $level = 0)
    {
        $tree = [];

        foreach ($folders as $folder) {
            $folderData = [
                'id' => $folder->id,
                'name' => $folder->name,
                'description' => $folder->description,
                'folder_type' => $folder->folder_type,
                'color' => $folder->color,
                'icon' => $folder->icon,
                'is_system_folder' => $folder->is_system_folder,
                'is_private' => $folder->is_private,
                'level' => $level,
                'documents_count' => $folder->documents()->visibleBy($user)->count(),
                'total_documents_count' => $folder->getTotalDocumentsCount(),
                'children' => []
            ];

            // Récupérer les sous-dossiers visibles
            $subFolders = $folder->subFolders()
                               ->visibleBy($user)
                               ->orderBy('sort_order')
                               ->orderBy('name')
                               ->get();

            if ($subFolders->isNotEmpty()) {
                $folderData['children'] = $this->buildTree($subFolders, $user, $level + 1);
            }

            $tree[] = $folderData;
        }

        return $tree;
    }

    /**
     * Obtenir les types de dossiers disponibles
     */
    public function getFolderTypes()
    {
        return response()->json([
            'success' => true,
            'data' => DocumentFolder::FOLDER_TYPES
        ]);
    }

    /**
     * Rechercher dans les dossiers
     */
    public function search(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'query' => 'required|string|min:2|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terme de recherche invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $searchTerm = $request->query;

            $folders = DocumentFolder::visibleBy($user)
                                   ->where(function ($q) use ($searchTerm) {
                                       $q->where('name', 'like', "%{$searchTerm}%")
                                         ->orWhere('description', 'like', "%{$searchTerm}%");
                                   })
                                   ->with(['creator', 'parentFolder'])
                                   ->orderBy('name')
                                   ->get();

            foreach ($folders as $folder) {
                $folder->total_documents = $folder->getTotalDocumentsCount();
            }

            return response()->json([
                'success' => true,
                'data' => $folders
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}