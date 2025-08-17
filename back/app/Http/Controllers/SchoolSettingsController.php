<?php

namespace App\Http\Controllers;

use App\Models\SchoolSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class SchoolSettingsController extends Controller
{
    /**
     * Obtenir les paramètres de l'école
     */
    public function index()
    {
        try {
            $settings = SchoolSetting::getSettings();
            
            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des paramètres',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour les paramètres de l'école
     */
    public function update(Request $request)
    {
        // Débogage temporaire
        \Log::info('SchoolSettings update request:', $request->all());
        \Log::info('SchoolSettings files:', $request->allFiles());
        \Log::info('SchoolSettings content type:', ['content_type' => $request->header('Content-Type')]);
        \Log::info('User authenticated:', auth()->check() ? auth()->user()->toArray() : 'Not authenticated');
        
        // Spécifiquement pour les champs WhatsApp
        \Log::info('WhatsApp fields:', [
            'whatsapp_notification_number' => $request->get('whatsapp_notification_number'),
            'whatsapp_notifications_enabled' => $request->get('whatsapp_notifications_enabled'),
            'whatsapp_api_url' => $request->get('whatsapp_api_url'),
            'whatsapp_instance_id' => $request->get('whatsapp_instance_id'),
            'whatsapp_token' => $request->get('whatsapp_token')
        ]);
        
        $validator = Validator::make($request->all(), [
            'school_name' => 'required|string|max:255',
            'school_motto' => 'nullable|string|max:255',
            'school_address' => 'nullable|string',
            'school_phone' => 'nullable|string|max:50',
            'school_email' => 'nullable|email|max:255',
            'school_website' => 'nullable|string|max:255',
            'school_logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            'currency' => 'nullable|string|max:10',
            'bank_name' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'footer_text' => 'nullable|string',
            'scholarship_deadline' => 'nullable|date',
            'reduction_percentage' => 'nullable|numeric|min:0|max:100',
            'primary_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            // Champs WhatsApp UltraMsg
            'whatsapp_notification_number' => 'nullable|string|max:50',
            'whatsapp_notifications_enabled' => 'nullable|in:true,false,1,0',
            'whatsapp_api_url' => 'nullable|string|max:255',
            'whatsapp_instance_id' => 'nullable|string|max:100',
            'whatsapp_token' => 'nullable|string|max:255'
        ]);

        if ($validator->fails()) {
            // Débogage temporaire  
            \Log::error('SchoolSettings validation failed:', $validator->errors()->toArray());
            
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            \Log::info('Getting school settings...');
            $settings = SchoolSetting::getSettings();
            \Log::info('Settings retrieved:', $settings ? $settings->toArray() : 'null');
            
            $data = $request->except(['school_logo']);
            \Log::info('Data to update:', $data);

            // Convertir le boolean WhatsApp
            if (isset($data['whatsapp_notifications_enabled'])) {
                $data['whatsapp_notifications_enabled'] = filter_var($data['whatsapp_notifications_enabled'], FILTER_VALIDATE_BOOLEAN);
            }

            // Appliquer des valeurs par défaut pour les champs requis
            $data = array_merge([
                'currency' => 'FCFA',
                'reduction_percentage' => 10,
                'bank_name' => '',
                'country' => '',
                'city' => '',
                'primary_color' => '#007bff'
            ], $data);

            // Gérer l'upload du logo
            if ($request->hasFile('school_logo')) {
                try {
                    \Log::info('Starting logo upload...');
                    
                    // Supprimer l'ancien logo
                    if ($settings->school_logo && Storage::exists('public/' . $settings->school_logo)) {
                        Storage::delete('public/' . $settings->school_logo);
                        \Log::info('Old logo deleted: ' . $settings->school_logo);
                    }

                    // Créer le dossier logos s'il n'existe pas
                    if (!Storage::disk('public')->exists('logos')) {
                        Storage::disk('public')->makeDirectory('logos');
                        \Log::info('Created logos directory');
                    }

                    // Sauvegarder le nouveau logo
                    $logoFile = $request->file('school_logo');
                    \Log::info('Logo file info:', [
                        'name' => $logoFile->getClientOriginalName(),
                        'size' => $logoFile->getSize(),
                        'mime' => $logoFile->getMimeType()
                    ]);
                    
                    $logoPath = $logoFile->store('logos', 'public');
                    $data['school_logo'] = $logoPath;
                    
                    \Log::info('Logo uploaded successfully: ' . $logoPath);
                } catch (\Exception $logoError) {
                    \Log::error('Logo upload error: ' . $logoError->getMessage());
                    return response()->json([
                        'success' => false,
                        'message' => 'Erreur lors de l\'upload du logo: ' . $logoError->getMessage(),
                        'error' => $logoError->getMessage()
                    ], 500);
                }
            }

            $settings->update($data);

            return response()->json([
                'success' => true,
                'data' => $settings->fresh(),
                'message' => 'Paramètres mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            \Log::error('SchoolSettings update general error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour des paramètres',
                'error' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Obtenir l'URL du logo
     */
    public function getLogo()
    {
        try {
            $settings = SchoolSetting::getSettings();
            
            if ($settings->school_logo && Storage::exists('public/' . $settings->school_logo)) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'logo_url' => Storage::url($settings->school_logo)
                    ]
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Logo non trouvé'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du logo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tester la configuration WhatsApp
     */
    public function testWhatsApp()
    {
        try {
            $whatsappService = app(\App\Services\WhatsAppService::class);
            $result = $whatsappService->testConfiguration();

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message']
            ], $result['success'] ? 200 : 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du test WhatsApp',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
