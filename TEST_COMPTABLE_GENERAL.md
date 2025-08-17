# Test des Permissions - Comptable Général

## 🎯 Permissions du Comptable Général

Le comptable général doit avoir exactement les **mêmes droits qu'un comptable** + **gestion des besoins**.

### ✅ ACCÈS AUTORISÉ (même que comptable)

#### Navigation disponible :
1. **Comptabilité**
   - Classes (consultation)
   - Statistiques 
   - Rechercher

2. **Besoins** (NOUVEAU - spécifique au comptable général)
   - 🆕 **Gestion des Besoins** - Approuver/rejeter toutes demandes
   - 🆕 **Mes Besoins** - Émettre ses propres demandes

3. **Paiements**
   - États de Paiements

4. **Rapports**
   - Rapports Financiers

5. **Outils**
   - Inventaire
   - Documents

6. **Compte**
   - Profil

#### Routes accessibles :
- `/class-comp` - Classes comptable
- `/stats` - Statistiques  
- `/search` - Recherche
- `/payment-reports` - États paiements
- `/reports` - Rapports financiers
- `/inventory` - Inventaire
- `/documents` - Documents
- `/profile` - Profil
- 🆕 `/needs-management` - Gestion des besoins
- 🆕 `/my-needs` - Mes besoins

### ❌ ACCÈS INTERDIT (réservé admin)

Le comptable général ne doit **PAS** avoir accès à :

#### Navigation absente :
- ❌ **Gestion Académique** (sections, niveaux, classes)
- ❌ **Administration** (utilisateurs, paramètres)
- ❌ **Enseignants** (gestion des enseignants)
- ❌ **Surveillance** (assignations surveillants)

#### Routes bloquées :
- ❌ `/sections` - Gestion sections
- ❌ `/levels` - Gestion niveaux  
- ❌ `/school-classes` - Gestion classes
- ❌ `/payment-tranches` - Tranches paiement
- ❌ `/settings` - Paramètres système
- ❌ `/school-years` - Années scolaires
- ❌ `/user-management` - Gestion utilisateurs
- ❌ `/subjects` - Gestion matières
- ❌ `/teachers` - Gestion enseignants
- ❌ `/teacher-assignments` - Assignations enseignants
- ❌ `/supervisor-assignments` - Assignations surveillants

## 🧪 Plan de Test

### Compte de test :
- **Utilisateur**: pharmacie12
- **Rôle**: general_accountant

### Tests à effectuer :

#### 1. ✅ Vérifier l'accès autorisé
- [ ] Se connecter avec pharmacie12
- [ ] Vérifier que le menu contient seulement les 6 sections autorisées
- [ ] Tester l'accès à chaque page autorisée
- [ ] **Spécialement tester "Gestion des Besoins"**

#### 2. ❌ Vérifier les restrictions
- [ ] Essayer d'accéder directement aux URLs interdites
- [ ] Vérifier le message "Accès non autorisé"
- [ ] Confirmer que le menu n'affiche pas les sections admin

#### 3. 🆕 Tester les fonctionnalités besoins
- [ ] Créer un besoin dans "Mes Besoins"
- [ ] Approuver/rejeter des besoins dans "Gestion des Besoins"
- [ ] Voir les statistiques des besoins

## 🎯 Résultat Attendu

Le comptable général doit avoir exactement :
- **Comptable classique** : Classes, Stats, Recherche, Paiements, Rapports, Inventaire, Documents, Profil
- **+ Besoins** : Gestion des Besoins, Mes Besoins
- **- Fonctions admin** : Aucune fonction administrative

C'est parfait ! 🎉