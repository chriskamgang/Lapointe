<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    /**
     * Liste de tous les utilisateurs
     */
    public function index(Request $request)
    {
        try {
            $query = User::select('id', 'name', 'username', 'email', 'contact', 'photo', 'role', 'is_active', 'created_at')
                ->whereIn('role', ['surveillant_general', 'general_accountant', 'comptable_superieur', 'comptable', 'secretaire', 'teacher', 'accountant']); // Tous les rôles gérables (enseignants créés ailleurs)

            // Système de recherche
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('contact', 'like', "%{$search}%")
                      ->orWhere('role', 'like', "%{$search}%");
                });
            }

            // Filtre par rôle
            if ($request->has('role') && !empty($request->role) && $request->role !== 'all') {
                $query->where('role', $request->role);
            }

            // Filtre par statut
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('is_active', $request->status === 'active');
            }

            $users = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des utilisateurs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer un nouvel utilisateur
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'contact' => 'nullable|string|max:20',
                'photo' => 'nullable|string|max:500',
                'role' => 'required|in:surveillant_general,general_accountant,comptable_superieur,comptable,secretaire,accountant',
                'generate_password' => 'boolean'
            ], [
                'name.required' => 'Le nom complet est obligatoire.',
                'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
                'email.required' => 'L\'adresse e-mail est obligatoire.',
                'email.email' => 'L\'adresse e-mail doit être valide.',
                'email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre utilisateur.',
                'contact.string' => 'Le numéro de téléphone doit être une chaîne de caractères.',
                'contact.max' => 'Le numéro de téléphone ne peut pas dépasser 20 caractères.',
                'role.required' => 'Le rôle est obligatoire.',
                'role.in' => 'Le rôle sélectionné n\'est pas valide.'
            ]);

            if ($validator->fails()) {
                // Construire un message d'erreur plus informatif basé sur les erreurs
                $errors = $validator->errors();
                $firstError = $errors->first();
                
                return response()->json([
                    'success' => false,
                    'message' => $firstError, // Utiliser la première erreur comme message principal
                    'errors' => $errors
                ], 422);
            }

            // Générer un mot de passe ou utiliser celui fourni
            $password = $request->password ?? $this->generatePassword();
            
            // Générer un username à partir de l'email
            $username = explode('@', $request->email)[0];
            
            $user = User::create([
                'name' => $request->name,
                'username' => $username,
                'email' => $request->email,
                'contact' => $request->contact,
                'photo' => $request->photo,
                'password' => Hash::make($password),
                'role' => $request->role,
                'is_active' => true,
                'email_verified_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user->only(['id', 'name', 'username', 'email', 'contact', 'photo', 'role', 'is_active', 'created_at']),
                    'password' => $password // Retourner le mot de passe généré pour l'admin
                ],
                'message' => 'Utilisateur créé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un utilisateur spécifique
     */
    public function show($id)
    {
        try {
            $user = User::select('id', 'name', 'username', 'email', 'contact', 'photo', 'role', 'is_active', 'created_at')
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Mettre à jour un utilisateur
     */
    public function update(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $id,
                'contact' => 'nullable|string|max:20',
                'photo' => 'nullable|string|max:500', // Nullable en update
                'role' => 'required|in:surveillant_general,general_accountant,comptable_superieur,comptable,secretaire,accountant',
                'is_active' => 'boolean'
            ], [
                'name.required' => 'Le nom complet est obligatoire.',
                'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
                'email.required' => 'L\'adresse e-mail est obligatoire.',
                'email.email' => 'L\'adresse e-mail doit être valide.',
                'email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre utilisateur.',
                'contact.string' => 'Le numéro de téléphone doit être une chaîne de caractères.',
                'contact.max' => 'Le numéro de téléphone ne peut pas dépasser 20 caractères.',
                'role.required' => 'Le rôle est obligatoire.',
                'role.in' => 'Le rôle sélectionné n\'est pas valide.'
            ]);

            if ($validator->fails()) {
                // Construire un message d'erreur plus informatif basé sur les erreurs
                $errors = $validator->errors();
                $firstError = $errors->first();
                
                return response()->json([
                    'success' => false,
                    'message' => $firstError, // Utiliser la première erreur comme message principal
                    'errors' => $errors
                ], 422);
            }

            $updateData = [
                'name' => $request->name,
                'username' => explode('@', $request->email)[0], // Générer username depuis email
                'email' => $request->email,
                'contact' => $request->contact,
                'role' => $request->role,
                'is_active' => $request->is_active ?? $user->is_active
            ];

            // N'update la photo que si elle est fournie
            if ($request->has('photo') && $request->photo !== null) {
                $updateData['photo'] = $request->photo;
            }

            $user->update($updateData);

            return response()->json([
                'success' => true,
                'data' => $user->only(['id', 'name', 'username', 'email', 'contact', 'photo', 'role', 'is_active', 'created_at']),
                'message' => 'Utilisateur mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Réinitialiser le mot de passe d'un utilisateur
     */
    public function resetPassword($id)
    {
        try {
            $user = User::findOrFail($id);
            $newPassword = $this->generatePassword();

            $user->update([
                'password' => Hash::make($newPassword)
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'new_password' => $newPassword
                ],
                'message' => 'Mot de passe réinitialisé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la réinitialisation du mot de passe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activer/Désactiver un utilisateur
     */
    public function toggleStatus($id)
    {
        try {
            $user = User::findOrFail($id);
            
            $user->update([
                'is_active' => !$user->is_active
            ]);

            return response()->json([
                'success' => true,
                'data' => $user->only(['id', 'name', 'username', 'email', 'contact', 'photo', 'role', 'is_active']),
                'message' => $user->is_active ? 'Utilisateur activé' : 'Utilisateur désactivé'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du changement de statut',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un utilisateur
     */
    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            
            // Empêcher la suppression des admins
            if ($user->role === 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer un administrateur'
                ], 403);
            }

            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer un mot de passe aléatoire
     */
    private function generatePassword($length = 8)
    {
        return Str::random($length);
    }

    /**
     * Obtenir les statistiques des utilisateurs
     */
    public function getStats()
    {
        try {
            // Statistiques pour tous les utilisateurs non-admin
            $managedRoles = ['surveillant_general', 'comptable', 'secretaire', 'teacher', 'accountant'];
            $stats = [
                'total_users' => User::whereIn('role', $managedRoles)->count(),
                'active_users' => User::whereIn('role', $managedRoles)->where('is_active', true)->count(),
                'inactive_users' => User::whereIn('role', $managedRoles)->where('is_active', false)->count(),
                'by_role' => [
                    'surveillant_general' => User::where('role', 'surveillant_general')->count(),
                    'comptable' => User::where('role', 'comptable')->count(),
                    'secretaire' => User::where('role', 'secretaire')->count(),
                    'teacher' => User::where('role', 'teacher')->count(),
                    'accountant' => User::where('role', 'accountant')->count(),
                ]
            ];

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
     * Générer une carte d'identité professionnelle pour un utilisateur
     */
    public function generateProfessionalCard($id)
    {
        try {
            $user = User::findOrFail($id);

            // Vérifier que l'utilisateur n'est pas admin
            if ($user->role === 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de générer une carte pour un administrateur'
                ], 403);
            }

            // Générer le contenu QR pour l'utilisateur professionnel
            $qrContent = "STAFF_ID_" . $user->id;
            $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrContent);

            // Préparer les données pour la carte
            $cardData = [
                'user' => $user,
                'qr_content' => $qrContent,
                'qr_url' => $qrUrl,
                'generated_at' => now()->format('d/m/Y H:i:s')
            ];

            // Générer le PDF de la carte
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('exports.staff.professional-card', $cardData);
            $pdf->setPaper([0, 0, 320, 200], 'landscape'); // Format carte bancaire (86mm x 54mm en points)

            $fileName = 'carte_professionnelle_' . Str::slug($user->name) . '_' . now()->format('Y-m-d') . '.pdf';
            
            return $pdf->download($fileName);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de la carte professionnelle',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les données QR pour un utilisateur (pour affichage en frontend)
     */
    public function getUserQR($id)
    {
        try {
            $user = User::findOrFail($id);

            // Vérifier que l'utilisateur n'est pas admin
            if ($user->role === 'admin') {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de générer un QR pour un administrateur'
                ], 403);
            }

            // Générer le contenu QR pour l'utilisateur professionnel
            $qrContent = "STAFF_ID_" . $user->id;
            $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrContent);

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_role' => $user->role,
                    'qr_content' => $qrContent,
                    'qr_url' => $qrUrl
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du QR code',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}