# Guide de Gestion d'Erreurs - Système de Gestion Scolaire

## 🛡️ Vue d'ensemble

Ce système de gestion d'erreurs robuste protège l'application contre les crashes et améliore l'expérience utilisateur en gérant gracieusement tous les types d'erreurs.

## 📁 Structure des Fichiers

```
src/
├── utils/
│   ├── api.js              # API sécurisée avec retry et gestion d'erreurs
│   ├── rateLimiter.js      # Limitation de débit côté client
│   └── fetch.js            # Configuration de base
├── hooks/
│   └── useApi.js           # Hooks personnalisés pour API
├── components/
│   ├── ErrorBoundary.jsx   # Composant de capture d'erreurs React
│   └── NetworkStatus.jsx   # Indicateur de statut réseau
```

## 🔧 Composants Principaux

### 1. API Sécurisée (`utils/api.js`)

**Fonctionnalités :**
- ✅ Retry automatique avec backoff exponentiel pour erreur 429
- ✅ Timeout configurable (30s par défaut)
- ✅ Gestion d'erreurs par type avec messages personnalisés
- ✅ Redirection automatique si session expirée
- ✅ Limitation de débit intégrée

**Utilisation :**
```javascript
import { apiEndpoints } from '../utils/api';

// Utilisation directe
try {
  const teachers = await apiEndpoints.getAllTeachers();
} catch (error) {
  // Erreur gérée automatiquement
}

// Avec configuration personnalisée
import { api } from '../utils/api';
const data = await api.get('/custom-endpoint', {
  timeout: 10000,
  retries: 1,
  showUserMessage: false
});
```

### 2. Hooks Personnalisés (`hooks/useApi.js`)

**Hooks disponibles :**
- `useApi()` - Hook générique avec gestion d'état
- `useTeachers()` - Gestion des enseignants
- `useStudents(classId)` - Gestion des étudiants par classe
- `useCrudApi()` - Opérations CRUD génériques

**Exemple d'utilisation :**
```javascript
import { useTeachers } from '../hooks/useApi';

const TeachersComponent = () => {
  const { 
    items: teachers, 
    loading, 
    error, 
    deleteItem: deleteTeacher,
    refetch 
  } = useTeachers();

  if (loading) return <LoadingSpinner />;
  
  return (
    <div>
      {teachers.map(teacher => (
        <div key={teacher.id}>
          {teacher.name}
          <button onClick={() => deleteTeacher(teacher.id)}>
            Supprimer
          </button>
        </div>
      ))}
    </div>
  );
};
```

### 3. ErrorBoundary (`components/ErrorBoundary.jsx`)

**Protection contre les crashes React :**
```javascript
import ErrorBoundary from '../components/ErrorBoundary';

const App = () => (
  <ErrorBoundary>
    <YourComponent />
  </ErrorBoundary>
);
```

### 4. Rate Limiter (`utils/rateLimiter.js`)

**Protection contre les erreurs 429 :**
- Limite : 5 requêtes par seconde
- File d'attente automatique
- Backoff exponentiel pour erreurs 429

## 🚨 Types d'Erreurs Gérées

### Erreurs Réseau
- **401** - Session expirée → Redirection vers login
- **403** - Permissions insuffisantes
- **404** - Ressource non trouvée
- **429** - Trop de requêtes → Retry avec délai exponentiel
- **500** - Erreur serveur
- **Timeout** - Requête trop lente

### Erreurs React
- Crashes de composants → Interface de fallback
- Erreurs asynchrones → Capture et notification

### Erreurs de Validation
- Données invalides → Messages détaillés
- Champs manquants → Indication précise

## 🎯 Messages d'Erreur

Tous les messages sont en français et adaptés au contexte :
- "Session expirée. Veuillez vous reconnecter."
- "Trop de requêtes. Veuillez patienter un moment."
- "Impossible de se connecter au serveur."

## 📊 Indicateurs Visuels

### Statut Réseau
```javascript
import NetworkStatus from '../components/NetworkStatus';

const App = () => (
  <>
    <NetworkStatus />
    <YourApp />
  </>
);
```

### Indicateur de Rate Limiting
```javascript
import { RateLimitIndicator } from '../components/NetworkStatus';
import { useRateLimiterStats } from '../utils/rateLimiter';

const App = () => {
  const rateLimitStats = useRateLimiterStats();
  
  return (
    <>
      <YourApp />
      <RateLimitIndicator stats={rateLimitStats} />
    </>
  );
};
```

## 🔄 Configuration

### Paramètres par Défaut
```javascript
const DEFAULT_CONFIG = {
  timeout: 30000,      // 30 secondes
  retries: 3,          // 3 tentatives
  retryDelay: 1000,    // 1 seconde
  maxRetryDelay: 10000 // 10 secondes max
};
```

### Rate Limiter
```javascript
// 5 requêtes par seconde maximum
const rateLimiter = new RateLimiter(5, 1000);
```

## 🛠️ Migration d'Anciens Composants

### Avant (code fragile)
```javascript
const loadData = async () => {
  const response = await fetch('/api/data');
  const data = await response.json();
  setData(data);
};
```

### Après (code robuste)
```javascript
import { useApi } from '../hooks/useApi';

const { data, loading, error } = useApi(
  () => apiEndpoints.getData(),
  [],
  { immediate: true }
);
```

## 🔍 Débogage

### Logs Console
- Tentatives de retry avec délais
- Erreurs de rate limiting
- États de connexion réseau

### Mode Développement
- Détails d'erreur complets dans ErrorBoundary
- Stack traces pour les crashes React

## 📝 Bonnes Pratiques

1. **Toujours utiliser les hooks personnalisés** pour les opérations API
2. **Envelopper les composants** dans ErrorBoundary
3. **Tester les cas d'erreur** (connexion lente, serveur indisponible)
4. **Utiliser les indicateurs visuels** pour informer l'utilisateur
5. **Ne pas ignorer les erreurs** - toujours les logger

## 🚀 Résultat

Avec ce système :
- ❌ **Fini les crashes** d'application
- ✅ **Messages d'erreur clairs** en français
- ✅ **Retry automatique** pour les erreurs temporaires
- ✅ **Protection contre les limites** de taux de requêtes
- ✅ **Expérience utilisateur fluide** même en cas de problème réseau

L'application est maintenant **robuste** et **professionnelle** ! 🎉