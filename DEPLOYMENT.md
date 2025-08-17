# Guide de Déploiement - Système de Gestion Collégiale

## Configuration du Backend (Laravel)

### 1. Upload des fichiers
- Uploadez tous les fichiers du dossier `back/` sur votre serveur
- Assurez-vous que le serveur web pointe vers le dossier `public/`

### 2. Configuration de l'environnement
- Copiez `.env.production.example` vers `.env`
- Modifiez les variables suivantes dans `.env`:
  ```
  APP_URL=https://votre-domaine.com
  DB_HOST=votre_host_db
  DB_DATABASE=votre_base_de_donnees
  DB_USERNAME=votre_utilisateur_db
  DB_PASSWORD=votre_mot_de_passe_db
  ```

### 3. Installation des dépendances
```bash
composer install --no-dev --optimize-autoloader
```

### 4. Génération de la clé d'application
```bash
php artisan key:generate
```

### 5. Migration de la base de données
```bash
php artisan migrate
php artisan db:seed
```

### 6. Optimisation pour la production
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 7. Permissions des dossiers
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

## Configuration du Frontend (React)

### 1. Modifier l'URL de l'API
Dans `front/src/utils/fetch.js`, remplacez `votre-domaine.com` par votre vraie URL:
```javascript
export const host = process.env.NODE_ENV === 'production' 
  ? "https://votre-vraie-url.com" 
  : "http://127.0.0.1:8000";
```

### 2. Build de production
```bash
cd front
npm install
npm run build
```

### 3. Upload du build
Uploadez le contenu du dossier `build/` vers votre serveur web.

## Configuration Apache

### 1. Virtual Host pour le Backend
```apache
<VirtualHost *:80>
    ServerName api.votre-domaine.com
    DocumentRoot /path/to/your/back/public
    
    <Directory /path/to/your/back/public>
        AllowOverride All
        Order allow,deny
        Allow from all
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/laravel_error.log
    CustomLog ${APACHE_LOG_DIR}/laravel_access.log combined
</VirtualHost>
```

### 2. Virtual Host pour le Frontend
```apache
<VirtualHost *:80>
    ServerName votre-domaine.com
    DocumentRoot /path/to/your/frontend/build
    
    <Directory /path/to/your/frontend/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Order allow,deny
        Allow from all
        Require all granted
        
        # React Router configuration
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Tests après déploiement

1. Testez l'API: `https://api.votre-domaine.com/api/test`
2. Testez l'authentification: `https://api.votre-domaine.com/api/auth/login`
3. Testez le frontend: `https://votre-domaine.com`

## Dépannage

### Erreur "Route not found"
- Vérifiez que le serveur pointe vers `public/`
- Vérifiez que mod_rewrite est activé
- Effacez le cache des routes: `php artisan route:clear`

### Erreurs CORS
Ajoutez dans `config/cors.php`:
```php
'allowed_origins' => ['https://votre-domaine.com'],
```

### Erreurs de permissions
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```