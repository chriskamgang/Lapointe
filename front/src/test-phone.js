// Test rapide pour vérifier la validation du numéro +23755773402

// Simulation de la fonction de validation
function validatePhone(phone) {
    if (!phone || phone.trim() === '') {
        return { isValid: true, message: '' };
    }
    
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^+\d]/g, '');
    
    // Check basic format
    const phoneRegex = /^(\+)?[1-9]\d{7,14}$/;
    const isValid = phoneRegex.test(cleanPhone);
    
    if (!isValid) {
        const message = 'Format de téléphone invalide. Utilisez 8-15 chiffres avec ou sans indicatif (+237...)';
        return { isValid: false, message };
    }
    
    // Additional validation for Cameroon numbers
    if (cleanPhone.startsWith('+237') || cleanPhone.startsWith('237')) {
        const number = cleanPhone.replace(/^\+?237/, '');
        if (number.length !== 9 || !number.startsWith('6')) {
            const message = 'Numéro camerounais invalide. Format attendu: +237 6XX XXX XXX';
            return { isValid: false, message };
        }
    }
    
    return { isValid: true, message: '' };
}

// Tests
const testNumbers = [
    '+23755773402',    // Votre numéro (devrait être invalide - commence par 5)
    '+237655773402',   // Cameroun valide (commence par 6)
    '+237 655 773 402', // Cameroun valide avec espaces
    '+33123456789',    // France (devrait être valide)
    '+1234567890',     // USA (devrait être valide)
];

console.log('=== Test de validation des numéros ===');
testNumbers.forEach(number => {
    const result = validatePhone(number);
    console.log(`${number}: ${result.isValid ? '✅ VALIDE' : '❌ INVALIDE'} - ${result.message || 'OK'}`);
});