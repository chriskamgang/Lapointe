# Guide d'Import des Étudiants

## 🚀 Routes d'Import Recommandées

### Import pour une série spécifique

```bash
# Import Excel/CSV pour la série ID 5
POST /api/students/series/5/import

# Import CSV uniquement pour la série ID 5  
POST /api/students/series/5/import/csv
```

## 📋 Format CSV Requis

### En-têtes obligatoires
```csv
id,nom,prenom,date_naissance,lieu_naissance,sexe,nom_parent,telephone_parent,email_parent,adresse,statut_etudiant,statut
```

### Exemples de données

```csv
id,nom,prenom,date_naissance,lieu_naissance,sexe,nom_parent,telephone_parent,email_parent,adresse,statut_etudiant,statut
,DUPONT,Jean,01/01/2010,Douala,M,Marie DUPONT,123456789,marie@example.com,Douala,nouveau,1
,MARTIN,Sophie,15/06/2009,Yaoundé,F,Paul MARTIN,987654321,paul@example.com,Yaoundé,ancien,1
123,BERNARD,Alice,12/03/2009,Douala,F,Pierre BERNARD,654321987,pierre@example.com,Douala,ancien,0
```

## 🎯 Logique d'Import

### Création d'étudiants (ID vide)
- **ID vide** = Nouvel étudiant
- Matricule généré automatiquement
- Série assignée automatiquement (depuis l'URL)
- Ordre calculé automatiquement

### Modification d'étudiants (ID fourni)
- **ID fourni** = Modification d'étudiant existant
- L'étudiant doit exister dans la même année scolaire
- Matricule conservé
- Série peut être changée

### Champs obligatoires
- `nom` : Nom de famille (requis)
- `prenom` : Prénom (requis)

### Champs optionnels
- `date_naissance` : Format `dd/mm/yyyy`
- `lieu_naissance` : Lieu de naissance
- `sexe` : `M`, `F`, `Masculin`, `Féminin`
- `nom_parent` : Nom du parent/tuteur
- `telephone_parent` : Numéro de téléphone
- `email_parent` : Email du parent
- `adresse` : Adresse de l'étudiant
- `statut_etudiant` : `nouveau`, `ancien`

### Statut (requis)
- `1` = Étudiant actif
- `0` = Étudiant inactif

## 💻 Exemples d'Utilisation

### JavaScript (Frontend)
```javascript
const importStudents = async (seriesId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`/api/students/series/${seriesId}/import`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
        console.log(`Créés: ${result.data.created}`);
        console.log(`Modifiés: ${result.data.updated}`);
        console.log(`Erreurs: ${result.data.errors.length}`);
    }
};

// Utilisation
const fileInput = document.getElementById('csvFile');
importStudents(5, fileInput.files[0]);
```

### cURL
```bash
# Import pour la série ID 5
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@template_eleves.csv" \
  http://localhost:4000/api/students/series/5/import
```

### PHP (Backend)
```php
use Illuminate\Http\Request;
use App\Http\Controllers\StudentController;

$controller = new StudentController();
$response = $controller->importForSeries($request, 5);
```

## 📤 Export pour Import

### Télécharger un CSV prêt à importer
```bash
GET /api/students/export/importable?class_series_id=5
```

### Télécharger le template
```bash
GET /api/students/template/download
```

## ⚠️ Gestion d'Erreurs

### Réponse d'erreur typique
```json
{
    "success": false,
    "message": "Erreur lors de l'import",
    "error": "Détails de l'erreur"
}
```

### Réponse de succès
```json
{
    "success": true,
    "data": {
        "created": 2,
        "updated": 1,
        "errors": [
            {
                "line": 4,
                "errors": ["Étudiant avec l'ID 999 non trouvé"]
            }
        ]
    },
    "message": "Import terminé avec succès"
}
```

## 🔧 Validation

### Fichier
- Extensions acceptées : `.xlsx`, `.xls`, `.csv`, `.txt`
- Taille maximum : 2048KB (2MB)

### Données
- Nettoyage automatique des cellules vides
- Conversion intelligente des types de données
- Validation des emails
- Vérification de l'existence des IDs

## 📊 Bonnes Pratiques

1. **Tester avec peu de données** d'abord
2. **Vérifier les erreurs** dans la réponse
3. **Utiliser les templates** fournis
4. **Sauvegarder** avant import en masse
5. **Vérifier l'année scolaire** active
6. **Valider la série** de destination

## 🚫 Routes Dépréciées

❌ **Ne plus utiliser :**
- `POST /api/students/import/excel`
- `POST /api/students/import/csv`

✅ **Utiliser à la place :**
- `POST /api/students/series/{seriesId}/import`
- `POST /api/students/series/{seriesId}/import/csv`