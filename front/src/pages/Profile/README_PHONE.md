# 📞 Gestion des numéros de téléphone

## ✅ Améliorations apportées

### 1. **Validation automatique**
- Format international supporté (+237, +33, +1, etc.)
- Validation spécifique pour les numéros camerounais
- Feedback visuel en temps réel

### 2. **Formatage intelligent**
- Auto-formatage lors de la perte de focus
- Suggestions de correction pour les formats mal saisis
- Détection automatique du pays

### 3. **Composants réutilisables**
- `usePhoneValidation` : Hook personnalisé pour la validation
- `PhoneInput` : Composant d'input avancé avec validation intégrée

## 🎯 Fonctionnalités

### UserProfile.jsx
```jsx
// Validation en temps réel
const handlePhoneChange = (value, fieldName) => {
    const validation = validatePhoneNumber(value);
    
    if (!validation.isValid && value !== '') {
        setError(validation.message);
    } else {
        setError('');
    }
    
    setProfileData({
        ...profileData,
        [fieldName]: value,
        // Sync both contact and phone_number fields
        ...(fieldName === 'contact' ? { phone_number: value } : { contact: value })
    });
};

// Auto-formatage
onBlur={(e) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted !== e.target.value) {
        setProfileData({
            ...profileData,
            contact: formatted,
            phone_number: formatted
        });
    }
}}
```

### Hook usePhoneValidation
```jsx
import { usePhoneValidation } from '../hooks/usePhoneValidation';

const { 
    validatePhone, 
    formatPhone, 
    cleanPhone, 
    detectCountry, 
    getSuggestions 
} = usePhoneValidation();

// Validation
const validation = validatePhone('+237671234567');
// { isValid: true, message: '' }

// Formatage
const formatted = formatPhone('237671234567');
// '+237 671 234 567'

// Détection de pays
const country = detectCountry('+237671234567');
// { country: 'Cameroun', flag: '🇨🇲', code: '+237' }
```

### Composant PhoneInput
```jsx
import PhoneInput from '../components/PhoneInput';

<PhoneInput
    label="Téléphone"
    value={phoneNumber}
    onChange={(e) => setPhoneNumber(e.target.value)}
    placeholder="+237 6XX XXX XXX"
    required={true}
    showSuggestions={true}
/>
```

## 📱 Formats supportés

### Cameroun 🇨🇲
- `+237 671 234 567` (recommandé)
- `237 671 234 567` 
- `671 234 567` (automatiquement converti)

### International 🌍
- `+33 1 23 45 67 89` (France)
- `+1 555 123 4567` (USA/Canada)
- `+234 801 234 5678` (Nigeria)

## 🔧 Configuration

### Traductions (local/params.js)
```javascript
{
    invalidPhoneFormat: "Format de téléphone invalide",
    invalidCameroonPhone: "Numéro camerounais invalide",
    phoneFormatHelp: "Formats acceptés :",
    phoneSuggestions: "Suggestions :",
    phoneFormatExample: "Exemple : +237 671 234 567",
    validFormat: "Format valide",
    invalidFormat: "Format invalide"
}
```

### API Backend
Les numéros sont synchronisés dans les champs :
- `contact` (pour admin/comptable)
- `phone_number` (pour enseignants)

## 🎨 Interface utilisateur

### Indicateurs visuels
- ✅ Icône verte pour format valide
- ❌ Icône rouge pour format invalide
- 🇨🇲 Drapeau du pays détecté
- 💡 Suggestions de correction automatiques

### Aide contextuelle
- Bouton d'aide avec formats acceptés
- Messages d'erreur descriptifs
- Exemples de formats valides

## 🚀 Utilisation dans d'autres composants

```jsx
// Import du hook
import { usePhoneValidation } from '../hooks/usePhoneValidation';

// Import du composant
import PhoneInput from '../components/PhoneInput';

// Utilisation simple
<PhoneInput
    label="Numéro de téléphone"
    value={phone}
    onChange={handlePhoneChange}
    required
/>
```

Cette amélioration rend la saisie des numéros de téléphone plus intuitive et réduit les erreurs de format.