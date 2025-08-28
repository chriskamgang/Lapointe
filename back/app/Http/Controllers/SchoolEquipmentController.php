<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\SchoolEquipment;
use App\Models\School;

class SchoolEquipmentController extends Controller
{
    /**
     * Obtenir les équipements d'une école spécifique
     */
    public function getEquipmentBySchool(Request $request, $schoolId)
    {
        try {
            $school = School::findOrFail($schoolId);
            
            $level = $request->input('level');
            $specialty = $request->input('specialty');
            $equipmentType = $request->input('equipment_type');
            $mandatoryOnly = $request->input('mandatory_only', false);

            $query = SchoolEquipment::where('school_id', $schoolId)
                ->where('is_active', true);

            if ($level) {
                $query->where(function($q) use ($level) {
                    $q->whereJsonContains('applicable_levels', $level)
                      ->orWhereNull('applicable_levels');
                });
            }

            if ($specialty) {
                $query->where(function($q) use ($specialty) {
                    $q->whereJsonContains('applicable_specialties', $specialty)
                      ->orWhereNull('applicable_specialties');
                });
            }

            if ($equipmentType) {
                $query->where('equipment_type', $equipmentType);
            }

            if ($mandatoryOnly) {
                $query->where('is_mandatory', true);
            }

            $equipment = $query->orderBy('order')->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                        'code' => $school->code
                    ],
                    'equipment' => $equipment,
                    'filters' => [
                        'level' => $level,
                        'specialty' => $specialty,
                        'equipment_type' => $equipmentType,
                        'mandatory_only' => $mandatoryOnly
                    ]
                ],
                'message' => 'Équipements récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des équipements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les équipements par code d'école (plus simple)
     */
    public function getEquipmentBySchoolCode($schoolCode)
    {
        try {
            $school = School::where('code', $schoolCode)->firstOrFail();
            
            $equipment = SchoolEquipment::where('school_id', $school->id)
                ->where('is_active', true)
                ->orderBy('equipment_type')
                ->orderBy('order')
                ->get()
                ->groupBy('equipment_type');

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                        'code' => $school->code
                    ],
                    'equipment_by_type' => $equipment,
                    'summary' => [
                        'total_items' => $equipment->flatten()->count(),
                        'mandatory_items' => $equipment->flatten()->where('is_mandatory', true)->count(),
                        'types' => $equipment->keys()->toArray()
                    ]
                ],
                'message' => 'Équipements récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des équipements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les vêtements requis pour une école (blouse vs polo)
     */
    public function getRequiredClothing($schoolCode)
    {
        try {
            $school = School::where('code', $schoolCode)->firstOrFail();
            
            $clothing = SchoolEquipment::where('school_id', $school->id)
                ->where('equipment_type', 'clothing')
                ->where('is_mandatory', true)
                ->where('is_active', true)
                ->orderBy('order')
                ->get();

            $clothingByCategory = $clothing->groupBy('category');

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => [
                        'name' => $school->name,
                        'code' => $school->code
                    ],
                    'required_clothing' => $clothing,
                    'by_category' => $clothingByCategory,
                    'uniform_type' => $clothingByCategory->keys()->contains('blouse') ? 'blouse' : 'polo'
                ],
                'message' => 'Vêtements requis récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des vêtements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lister tous les équipements avec pagination et filtres
     */
    public function index(Request $request)
    {
        try {
            $query = SchoolEquipment::with('school');

            // Filtrer par école si spécifiée
            if ($request->has('school_id') && $request->school_id) {
                $query->where('school_id', $request->school_id);
            }

            if ($request->has('school_code') && $request->school_code) {
                $query->whereHas('school', function($q) use ($request) {
                    $q->where('code', $request->school_code);
                });
            }

            // Filtrer par type d'équipement
            if ($request->has('equipment_type') && $request->equipment_type) {
                $query->where('equipment_type', $request->equipment_type);
            }

            // Filtrer par statut obligatoire
            if ($request->has('is_mandatory') && $request->is_mandatory !== null) {
                $query->where('is_mandatory', $request->is_mandatory);
            }

            // Filtrer par statut actif
            if ($request->has('is_active') && $request->is_active !== null) {
                $query->where('is_active', $request->is_active);
            }

            // Recherche par nom
            if ($request->has('search') && $request->search) {
                $query->where('item_name', 'LIKE', '%' . $request->search . '%');
            }

            // Ordonner les résultats
            $query->orderBy('school_id')->orderBy('equipment_type')->orderBy('order');

            $equipment = $query->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'filters' => $request->only(['school_id', 'school_code', 'equipment_type', 'is_mandatory', 'is_active', 'search']),
                'message' => 'Équipements récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des équipements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un équipement spécifique
     */
    public function show($id)
    {
        try {
            $equipment = SchoolEquipment::with('school')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'message' => 'Équipement trouvé'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Équipement non trouvé',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Créer un nouvel équipement
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'school_id' => 'required|exists:schools,id',
                'equipment_type' => 'required|in:clothing,medical,technical,security,academic',
                'item_name' => 'required|string|max:255',
                'price' => 'nullable|numeric|min:0',
                'category' => 'nullable|string|max:100',
                'description' => 'nullable|string|max:1000',
                'is_mandatory' => 'boolean',
                'applicable_levels' => 'nullable|array',
                'applicable_specialties' => 'nullable|array',
                'is_active' => 'boolean',
                'order' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Définir un ordre par défaut si pas fourni
            if (!$request->has('order')) {
                $maxOrder = SchoolEquipment::where('school_id', $request->school_id)
                    ->where('equipment_type', $request->equipment_type)
                    ->max('order');
                $request->merge(['order' => ($maxOrder ?? 0) + 1]);
            }

            $equipment = SchoolEquipment::create($request->all());
            $equipment->load('school');

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'message' => 'Équipement créé avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'équipement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un équipement
     */
    public function update(Request $request, $id)
    {
        try {
            $equipment = SchoolEquipment::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'school_id' => 'sometimes|required|exists:schools,id',
                'equipment_type' => 'sometimes|required|in:clothing,medical,technical,security,academic',
                'item_name' => 'sometimes|required|string|max:255',
                'price' => 'nullable|numeric|min:0',
                'category' => 'nullable|string|max:100',
                'description' => 'nullable|string|max:1000',
                'is_mandatory' => 'sometimes|boolean',
                'applicable_levels' => 'nullable|array',
                'applicable_specialties' => 'nullable|array',
                'is_active' => 'sometimes|boolean',
                'order' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $equipment->update($request->all());
            $equipment->load('school');

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'message' => 'Équipement mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'équipement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un équipement
     */
    public function destroy($id)
    {
        try {
            $equipment = SchoolEquipment::findOrFail($id);
            $equipment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Équipement supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'équipement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activer/désactiver un équipement
     */
    public function toggleStatus($id)
    {
        try {
            $equipment = SchoolEquipment::findOrFail($id);
            $equipment->update(['is_active' => !$equipment->is_active]);
            $equipment->load('school');

            return response()->json([
                'success' => true,
                'data' => $equipment,
                'message' => 'Statut de l\'équipement modifié avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la modification du statut',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Réordonner les équipements d'une école et d'un type donné
     */
    public function reorder(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'school_id' => 'required|exists:schools,id',
                'equipment_type' => 'required|in:clothing,medical,technical,security,academic',
                'equipment_orders' => 'required|array',
                'equipment_orders.*.id' => 'required|exists:school_equipment,id',
                'equipment_orders.*.order' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            foreach ($request->equipment_orders as $orderData) {
                SchoolEquipment::where('id', $orderData['id'])
                    ->where('school_id', $request->school_id)
                    ->where('equipment_type', $request->equipment_type)
                    ->update(['order' => $orderData['order']]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Ordre des équipements mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la réorganisation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques des équipements
     */
    public function getStats()
    {
        try {
            $totalEquipment = SchoolEquipment::count();
            $activeEquipment = SchoolEquipment::where('is_active', true)->count();
            $mandatoryEquipment = SchoolEquipment::where('is_mandatory', true)->count();
            
            $bySchool = SchoolEquipment::join('schools', 'school_equipment.school_id', '=', 'schools.id')
                ->selectRaw('schools.name as school_name, schools.code as school_code, COUNT(*) as count')
                ->groupBy('schools.id', 'schools.name', 'schools.code')
                ->get();

            $byType = SchoolEquipment::selectRaw('equipment_type, COUNT(*) as count')
                ->groupBy('equipment_type')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'total' => $totalEquipment,
                    'active' => $activeEquipment,
                    'mandatory' => $mandatoryEquipment,
                    'by_school' => $bySchool,
                    'by_type' => $byType
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
}