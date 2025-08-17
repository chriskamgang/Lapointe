// Debug détaillé pour le numéro +23755773402

function debugPhoneValidation(phone) {
    console.log(`\n=== DEBUG: ${phone} ===`);
    
    if (!phone || phone.trim() === '') {
        console.log('✓ Numéro vide - considéré comme valide');
        return { isValid: true, message: '' };
    }
    
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^+\d]/g, '');
    console.log(`Numéro nettoyé: "${cleanPhone}"`);
    
    // Check basic format
    const phoneRegex = /^(\+)?[1-9]\d{7,14}$/;
    const basicValid = phoneRegex.test(cleanPhone);
    console.log(`Validation de base (regex ${phoneRegex}): ${basicValid ? '✓' : '✗'}`);
    
    if (!basicValid) {
        const message = 'Format de téléphone invalide. Utilisez 8-15 chiffres avec ou sans indicatif (+237...)';
        console.log(`❌ ÉCHEC validation de base: ${message}`);
        return { isValid: false, message };
    }
    
    // Additional validation for Cameroon numbers
    if (cleanPhone.startsWith('+237') || cleanPhone.startsWith('237')) {
        console.log('📍 Détecté comme numéro camerounais');
        
        const number = cleanPhone.replace(/^\+?237/, '');
        console.log(`Numéro après suppression de l'indicatif: "${number}"`);
        console.log(`Longueur: ${number.length} (doit être 9)`);
        console.log(`Premier chiffre: "${number[0]}" (doit être 6)`);
        
        if (number.length !== 9) {
            const message = `Numéro camerounais invalide: longueur ${number.length} au lieu de 9. Format attendu: +237 6XX XXX XXX`;
            console.log(`❌ ÉCHEC longueur: ${message}`);
            return { isValid: false, message };
        }
        
        if (!number.startsWith('6')) {
            const message = `Numéro camerounais invalide: commence par ${number[0]} au lieu de 6. Format attendu: +237 6XX XXX XXX`;
            console.log(`❌ ÉCHEC premier chiffre: ${message}`);
            return { isValid: false, message };
        }
        
        console.log('✅ Numéro camerounais valide');
    } else {
        console.log('🌍 Numéro international (non-camerounais)');
    }
    
    console.log('✅ VALIDATION RÉUSSIE');
    return { isValid: true, message: '' };
}

// Test du numéro problématique
const testPhone = '+23755773402';
const result = debugPhoneValidation(testPhone);
console.log(`\n=== RÉSULTAT FINAL ===`);
console.log(`${testPhone}: ${result.isValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
if (!result.isValid) {
    console.log(`Message: ${result.message}`);
}

// Test d'autres variantes
console.log('\n=== TESTS SUPPLÉMENTAIRES ===');
[
    '23755773402',      // Sans +
    '+237 557 734 02',  // Avec espaces  
    '+237655773402',    // Version correcte avec 6
    '+237 655 773 402', // Version correcte avec espaces
].forEach(phone => {
    const result = debugPhoneValidation(phone);
    console.log(`${phone.padEnd(18)}: ${result.isValid ? '✅' : '❌'} ${result.message || ''}`);
});