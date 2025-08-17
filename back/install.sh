#!/bin/bash

echo "🚀 Installation du système de gestion scolaire..."
echo "=================================================="

# Vérifier si composer est installé
if ! command -v composer &> /dev/null; then
    echo "❌ Composer n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si PHP est installé
if ! command -v php &> /dev/null; then
    echo "❌ PHP n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Installation des dépendances
echo "📦 Installation des dépendances Composer..."
composer install

# Copier le fichier .env
if [ ! -f .env ]; then
    echo "📄 Création du fichier .env..."
    cp .env.example .env
    echo "⚠️  Veuillez configurer votre base de données dans le fichier .env"
    echo "   puis relancer ce script."
    exit 0
fi

# Générer la clé d'application
echo "🔑 Génération de la clé d'application..."
php artisan key:generate

# Générer la clé JWT
echo "🔐 Génération de la clé JWT..."
php artisan jwt:secret

# Créer les tables
echo "🗄️  Création des tables de base de données..."
php artisan migrate

# Lancer les seeders
echo "🌱 Initialisation des données de base..."
php artisan db:seed

# Configurer les utilisateurs de test
echo "👥 Configuration des utilisateurs de test..."
php artisan setup:test-users

# Créer les liens de stockage
echo "🔗 Création des liens de stockage..."
php artisan storage:link

echo ""
echo "🎉 Installation terminée avec succès !"
echo "======================================"
echo ""
echo "Utilisateurs de test disponibles :"
echo "- Admin:      username: admin       | password: password123"
echo "- Comptable:  username: comptable   | password: password123"
echo "- Enseignant: username: prof.martin | password: password123"
echo "- Utilisateur: username: user.test  | password: password123"
echo ""
echo "⚠️  N'oubliez pas de changer ces mots de passe en production !"
echo ""
echo "🚀 Vous pouvez maintenant démarrer le serveur avec :"
echo "   php artisan serve"