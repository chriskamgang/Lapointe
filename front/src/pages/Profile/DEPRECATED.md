# Composants Dépréciés

## ⚠️ Avertissement

Les composants suivants sont **dépréciés** et ne doivent plus être utilisés dans les nouveaux développements :

### Profile.jsx
- **Statut** : DÉPRÉCIÉ ❌
- **Remplacé par** : UserProfile.jsx
- **Raison** : Interface obsolète, fonctionnalités limitées

### EditProfile.jsx  
- **Statut** : DÉPRÉCIÉ ❌
- **Remplacé par** : UserProfile.jsx (mode édition intégré)
- **Raison** : Logique dupliquée, API non sécurisée

## ✅ Migration

### Ancien code :
```jsx
import Profile from '../Profile/Profile';
import EditProfile from '../Profile/EditProfile';

// Logique d'état complexe pour gérer l'édition
const [isEditing, setIsEditing] = useState(false);
{isEditing ? <EditProfile /> : <Profile />}
```

### Nouveau code :
```jsx
import UserProfile from '../Profile/UserProfile';

// Composant tout-en-un avec gestion d'état intégrée
<UserProfile />
```

## 🔧 Améliorations du nouveau composant

1. **Interface moderne** : Bootstrap 5, design cohérent
2. **Gestion des rôles** : Support admin, comptable, enseignant
3. **Upload d'avatar** : Gestion des images avec validation
4. **Sécurité** : API JWT, validation côté client/serveur
5. **Internationalisation** : Support multilingue intégré
6. **UX améliorée** : Notifications, états de chargement

## 📅 Planning de suppression

- **Phase 1** (actuelle) : Marquer comme déprécié, migration des usages
- **Phase 2** (dans 1 mois) : Ajouter des warnings de console
- **Phase 3** (dans 2 mois) : Suppression complète des fichiers

## 🚀 Utilisation recommandée

```jsx
import UserProfile from '../Profile/UserProfile';
// ou
import { UserProfile } from '../Profile';
```