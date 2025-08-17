<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PhotoUploadController extends Controller
{
    public function upload(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'photo' => 'required|image|mimes:jpeg,jpg,png|max:2048', // 2MB max
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            $file = $request->file('photo');
            
            // Générer un nom unique pour le fichier
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            
            // Stocker le fichier dans le dossier public/user_photos
            $path = Storage::disk('public')->putFileAs('user_photos', $file, $filename);
            
            if ($path) {
                // Retourner l'URL complète avec le bon port
                $url = Storage::url('user_photos/' . $filename);
                $fullUrl = request()->getSchemeAndHttpHost() . $url; // Utilise le même host que la requête
                
                // Mettre à jour la photo dans le profil utilisateur
                $user = auth()->user();
                if ($user) {
                    $user->photo = $fullUrl;
                    $user->save();
                }
                
                return response()->json([
                    'success' => true,
                    'data' => [
                        'filename' => $filename,
                        'url' => $fullUrl
                    ],
                    'message' => 'Photo uploadée avec succès'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de l\'upload'
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload de la photo',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}