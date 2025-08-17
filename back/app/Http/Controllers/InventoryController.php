<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * Liste tous les articles d'inventaire avec filtres et pagination
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = InventoryItem::query();

            // Filtres
            if ($request->has('category') && !empty($request->category)) {
                $query->byCategory($request->category);
            }

            if ($request->has('etat') && !empty($request->etat)) {
                $query->byEtat($request->etat);
            }

            if ($request->has('search') && !empty($request->search)) {
                $query->search($request->search);
            }

            if ($request->has('low_stock') && $request->low_stock) {
                $query->lowStock();
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $items = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $items,
                'message' => 'Articles récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des articles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Affiche un article spécifique
     */
    public function show(InventoryItem $inventoryItem): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $inventoryItem,
                'message' => 'Article récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'article',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crée un nouvel article d'inventaire
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255',
                'categorie' => ['required', 'string', Rule::in(InventoryItem::CATEGORIES)],
                'quantite' => 'required|integer|min:0',
                'quantite_min' => 'required|integer|min:0',
                'etat' => ['required', 'string', Rule::in(InventoryItem::ETATS)],
                'localisation' => 'required|string|max:255',
                'responsable' => 'required|string|max:255',
                'date_achat' => 'nullable|date',
                'prix' => 'required|numeric|min:0',
                'numero_serie' => 'nullable|string|max:255',
                'description' => 'nullable|string|max:1000'
            ]);

            $item = InventoryItem::create($validatedData);

            return response()->json([
                'success' => true,
                'data' => $item,
                'message' => 'Article créé avec succès'
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'article',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Met à jour un article d'inventaire
     */
    public function update(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'nom' => 'required|string|max:255',
                'categorie' => ['required', 'string', Rule::in(InventoryItem::CATEGORIES)],
                'quantite' => 'required|integer|min:0',
                'quantite_min' => 'required|integer|min:0',
                'etat' => ['required', 'string', Rule::in(InventoryItem::ETATS)],
                'localisation' => 'required|string|max:255',
                'responsable' => 'required|string|max:255',
                'date_achat' => 'nullable|date',
                'prix' => 'required|numeric|min:0',
                'numero_serie' => 'nullable|string|max:255',
                'description' => 'nullable|string|max:1000'
            ]);

            $inventoryItem->update($validatedData);

            return response()->json([
                'success' => true,
                'data' => $inventoryItem->fresh(),
                'message' => 'Article mis à jour avec succès'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'article',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprime un article d'inventaire
     */
    public function destroy(InventoryItem $inventoryItem): JsonResponse
    {
        try {
            $inventoryItem->delete();

            return response()->json([
                'success' => true,
                'message' => 'Article supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'article',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupère les statistiques du dashboard
     */
    public function dashboard(): JsonResponse
    {
        try {
            $stats = InventoryItem::getStats();
            $lowStockAlerts = InventoryItem::getLowStockAlerts();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'low_stock_alerts' => $lowStockAlerts
                ],
                'message' => 'Statistiques récupérées avec succès'
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
     * Exporte les données en JSON
     */
    public function export(Request $request): JsonResponse
    {
        try {
            $query = InventoryItem::query();

            // Appliquer les mêmes filtres que pour l'index
            if ($request->has('category') && !empty($request->category)) {
                $query->byCategory($request->category);
            }

            if ($request->has('etat') && !empty($request->etat)) {
                $query->byEtat($request->etat);
            }

            if ($request->has('search') && !empty($request->search)) {
                $query->search($request->search);
            }

            if ($request->has('low_stock') && $request->low_stock) {
                $query->lowStock();
            }

            $items = $query->orderBy('nom')->get();

            // Formater les données pour l'export
            $exportData = $items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'nom' => $item->nom,
                    'categorie' => $item->categorie,
                    'quantite' => $item->quantite,
                    'quantite_min' => $item->quantite_min,
                    'etat' => $item->etat,
                    'localisation' => $item->localisation,
                    'responsable' => $item->responsable,
                    'date_achat' => $item->formatted_date_achat,
                    'prix' => $item->prix,
                    'prix_formate' => $item->formatted_prix,
                    'numero_serie' => $item->numero_serie,
                    'description' => $item->description,
                    'valeur_totale' => $item->valeur_totale,
                    'is_low_stock' => $item->is_low_stock,
                    'created_at' => $item->created_at->format('d/m/Y H:i'),
                    'updated_at' => $item->updated_at->format('d/m/Y H:i')
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $exportData,
                'count' => $exportData->count(),
                'exported_at' => now()->format('d/m/Y H:i:s'),
                'message' => 'Données exportées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export des données',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupère les données de configuration (catégories, états)
     */
    public function config(): JsonResponse
    {
        try {
            // Récupérer les catégories utilisées + celles par défaut
            $usedCategories = InventoryItem::select('categorie')
                ->distinct()
                ->whereNotNull('categorie')
                ->pluck('categorie')
                ->toArray();
            
            $allCategories = array_unique(array_merge(InventoryItem::CATEGORIES, $usedCategories));
            sort($allCategories);

            return response()->json([
                'success' => true,
                'data' => [
                    'categories' => $allCategories,
                    'default_categories' => InventoryItem::CATEGORIES,
                    'etats' => InventoryItem::ETATS
                ],
                'message' => 'Configuration récupérée avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la configuration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ajoute une nouvelle catégorie personnalisée
     */
    public function addCategory(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'categorie' => 'required|string|max:255|unique:inventory_items,categorie'
            ], [
                'categorie.required' => 'Le nom de la catégorie est requis',
                'categorie.max' => 'Le nom de la catégorie ne peut pas dépasser 255 caractères',
                'categorie.unique' => 'Cette catégorie existe déjà'
            ]);

            // Vérifier que la catégorie n'existe pas déjà dans les catégories par défaut
            if (in_array($validatedData['categorie'], InventoryItem::CATEGORIES)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette catégorie existe déjà dans les catégories par défaut'
                ], 422);
            }

            // Créer un article temporaire avec cette catégorie pour l'enregistrer
            // (sera supprimé après avoir ajouté un vrai article avec cette catégorie)
            $tempItem = InventoryItem::create([
                'nom' => '__TEMP_CATEGORY_' . time(),
                'categorie' => $validatedData['categorie'],
                'quantite' => 0,
                'quantite_min' => 0,
                'etat' => 'Bon',
                'localisation' => '__TEMP__',
                'responsable' => '__TEMP__',
                'prix' => 0
            ]);

            // Supprimer immédiatement l'article temporaire
            $tempItem->delete();

            return response()->json([
                'success' => true,
                'message' => 'Catégorie ajoutée avec succès',
                'data' => ['categorie' => $validatedData['categorie']]
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout de la catégorie',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Met à jour la quantité d'un article (pour les ajustements rapides)
     */
    public function updateQuantity(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'quantite' => 'required|integer|min:0',
                'operation' => 'required|string|in:set,add,subtract'
            ]);

            $currentQuantity = $inventoryItem->quantite;
            $newQuantity = $currentQuantity;

            switch ($validatedData['operation']) {
                case 'set':
                    $newQuantity = $validatedData['quantite'];
                    break;
                case 'add':
                    $newQuantity = $currentQuantity + $validatedData['quantite'];
                    break;
                case 'subtract':
                    $newQuantity = max(0, $currentQuantity - $validatedData['quantite']);
                    break;
            }

            $inventoryItem->update(['quantite' => $newQuantity]);

            return response()->json([
                'success' => true,
                'data' => $inventoryItem->fresh(),
                'message' => 'Quantité mise à jour avec succès'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la quantité',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupère l'historique des mouvements d'un article
     */
    public function getMovements(InventoryItem $inventoryItem): JsonResponse
    {
        try {
            $movements = $inventoryItem->movements()
                ->orderBy('movement_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $movements,
                'message' => 'Mouvements récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des mouvements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupère les mouvements récents de tous les articles
     */
    public function getRecentMovements(Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 30);
            $limit = $request->get('limit', 50);

            $movements = InventoryMovement::with('inventoryItem')
                ->recent($days)
                ->orderBy('movement_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $movements,
                'message' => 'Mouvements récents récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des mouvements récents',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enregistre un mouvement de stock
     */
    public function recordMovement(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'type' => ['required', 'string', Rule::in(['in', 'out', 'adjustment'])],
                'new_quantity' => 'required|integer|min:0',
                'reason' => 'required|string|max:255',
                'notes' => 'nullable|string|max:1000'
            ]);

            $user = auth()->user();
            
            $inventoryItem->updateQuantityWithMovement(
                $validatedData['new_quantity'],
                $validatedData['reason'],
                $validatedData['type'],
                $validatedData['notes'] ?? null,
                $user->name ?? null,
                $user->id ?? null
            );

            // Recharger l'item avec ses mouvements
            $inventoryItem->refresh();
            $latestMovement = $inventoryItem->movements()->latest()->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'item' => $inventoryItem,
                    'movement' => $latestMovement
                ],
                'message' => 'Mouvement enregistré avec succès'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement du mouvement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Envoie une alerte WhatsApp pour les articles en stock faible
     */
    public function sendLowStockAlert(Request $request): JsonResponse
    {
        try {
            $whatsappService = app(WhatsAppService::class);
            $lowStockItems = InventoryItem::lowStock()->get();
            
            if ($lowStockItems->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucun article en stock faible. Aucune alerte envoyée.',
                    'low_stock_count' => 0
                ]);
            }

            $result = $whatsappService->sendLowStockAlert($lowStockItems);

            if ($result) {
                return response()->json([
                    'success' => true,
                    'message' => 'Alerte WhatsApp envoyée avec succès',
                    'low_stock_count' => $lowStockItems->count(),
                    'items_alerted' => $lowStockItems->pluck('nom')->toArray()
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Échec de l\'envoi de l\'alerte WhatsApp. Vérifiez la configuration.',
                    'low_stock_count' => $lowStockItems->count()
                ], 422);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi de l\'alerte WhatsApp',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Teste la configuration WhatsApp
     */
    public function testWhatsAppConfig(): JsonResponse
    {
        try {
            $whatsappService = app(WhatsAppService::class);
            $result = $whatsappService->testConfiguration();

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message']
            ], $result['success'] ? 200 : 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du test de configuration WhatsApp',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupère les articles en stock faible pour les alertes
     */
    public function getLowStockItems(): JsonResponse
    {
        try {
            $lowStockItems = InventoryItem::lowStock()
                ->with([]) // Pas besoin de relations pour cette requête
                ->orderBy('quantite', 'asc')
                ->get();

            $criticalItems = $lowStockItems->filter(function ($item) {
                return $item->quantite <= 0 || $item->quantite <= ($item->quantite_min / 2);
            });

            $stats = [
                'total_low_stock' => $lowStockItems->count(),
                'critical_items' => $criticalItems->count(),
                'out_of_stock' => $lowStockItems->where('quantite', 0)->count(),
                'categories_affected' => $lowStockItems->pluck('categorie')->unique()->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $lowStockItems,
                    'stats' => $stats
                ],
                'message' => 'Articles en stock faible récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des articles en stock faible',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}