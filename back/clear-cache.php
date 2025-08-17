<?php
// Script temporaire pour effacer le cache Laravel
// À supprimer après utilisation pour des raisons de sécurité

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

try {
    // Effacer le cache des configurations
    if (file_exists($app->getCachedConfigPath())) {
        unlink($app->getCachedConfigPath());
        echo "✓ Cache de configuration effacé\n";
    }

    // Effacer le cache des routes
    if (file_exists($app->getCachedRoutesPath())) {
        unlink($app->getCachedRoutesPath());
        echo "✓ Cache des routes effacé\n";
    }

    // Effacer le cache des vues
    $viewCachePath = $app->basePath('storage/framework/views');
    if (is_dir($viewCachePath)) {
        $files = glob($viewCachePath . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        echo "✓ Cache des vues effacé\n";
    }

    // Effacer le cache général
    $cachePath = $app->basePath('storage/framework/cache');
    if (is_dir($cachePath)) {
        $dirs = ['data', 'views'];
        foreach ($dirs as $dir) {
            $dirPath = $cachePath . '/' . $dir;
            if (is_dir($dirPath)) {
                $files = glob($dirPath . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        unlink($file);
                    }
                }
            }
        }
        echo "✓ Cache général effacé\n";
    }

    echo "\n🎉 Tous les caches ont été effacés avec succès !\n";
    echo "⚠️  N'oubliez pas de supprimer ce fichier pour des raisons de sécurité.\n";

} catch (Exception $e) {
    echo "❌ Erreur : " . $e->getMessage() . "\n";
}
?>