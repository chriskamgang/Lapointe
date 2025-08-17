<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Route pour servir les photos des élèves
Route::get('/storage/students/photos/{filename}', function ($filename) {
    $path = 'students/photos/' . $filename;
    
    if (!Storage::disk('public')->exists($path)) {
        abort(404);
    }
    
    $file = Storage::disk('public')->get($path);
    $type = Storage::disk('public')->mimeType($path);
    
    return response($file, 200)->header('Content-Type', $type);
})->where('filename', '.*');

// Route de fallback pour login (éviter l'erreur "Route [login] not defined")
Route::get('/login', function (\Illuminate\Http\Request $request) {
    if ($request->expectsJson() || $request->is('api/*')) {
        return response()->json([
            'success' => false,
            'message' => 'Non authentifié. Veuillez vous connecter.',
            'error' => 'Unauthorized'
        ], 401);
    }
    
    return redirect('/'); // Pour les requêtes web normales
})->name('login');
