import { useState, useCallback } from 'react';
import { paramsTraductions } from '../local/params';
import { getLang } from '../utils/lang';

/**
 * Hook personnalisé pour la validation et le formatage des numéros de téléphone
 * Optimisé pour les numéros camerounais (+237)
 */
export const usePhoneValidation = () => {
    const [phoneError, setPhoneError] = useState('');

    /**
     * Valide un numéro de téléphone
     * @param {string} phone - Le numéro à valider
     * @returns {object} - { isValid: boolean, message: string }
     */
    const validatePhone = useCallback((phone) => {
        if (!phone || phone.trim() === '') {
            setPhoneError('');
            return { isValid: true, message: '' };
        }
        
        // Remove all non-digit characters except +
        const cleanPhone = phone.replace(/[^+\d]/g, '');
        
        // Check basic format
        const phoneRegex = /^(\+)?[1-9]\d{7,14}$/;
        const isValid = phoneRegex.test(cleanPhone);
        
        if (!isValid) {
            const message = paramsTraductions[getLang()].invalidPhoneFormat || 
                           'Format de téléphone invalide. Utilisez 8-15 chiffres avec ou sans indicatif (+237...)';
            setPhoneError(message);
            return { isValid: false, message };
        }
        
        // Additional validation for Cameroon numbers
        if (cleanPhone.startsWith('+237') || cleanPhone.startsWith('237')) {
            const number = cleanPhone.replace(/^\+?237/, '');
            if (number.length !== 9 || !number.startsWith('6')) {
                const message = paramsTraductions[getLang()].invalidCameroonPhone || 
                               'Numéro camerounais invalide. Format attendu: +237 6XX XXX XXX';
                setPhoneError(message);
                return { isValid: false, message };
            }
        }
        
        setPhoneError('');
        return { isValid: true, message: '' };
    }, []);

    /**
     * Formate un numéro de téléphone pour l'affichage
     * @param {string} phone - Le numéro à formater
     * @returns {string} - Le numéro formaté
     */
    const formatPhone = useCallback((phone) => {
        if (!phone) return '';
        
        // Remove all non-digit characters except +
        let cleanPhone = phone.replace(/[^+\d]/g, '');
        
        // Format for Cameroon numbers (+237 6XX XXX XXX)
        if (cleanPhone.startsWith('+237')) {
            const number = cleanPhone.substring(4);
            if (number.length >= 9) {
                return `+237 ${number.substring(0, 1)}${number.substring(1, 3)} ${number.substring(3, 6)} ${number.substring(6, 9)}`;
            }
            return cleanPhone;
        } else if (cleanPhone.startsWith('237')) {
            const number = cleanPhone.substring(3);
            if (number.length >= 9) {
                return `+237 ${number.substring(0, 1)}${number.substring(1, 3)} ${number.substring(3, 6)} ${number.substring(6, 9)}`;
            }
            return `+${cleanPhone}`;
        } else if (cleanPhone.length === 9 && cleanPhone.startsWith('6')) {
            // Assume it's a Cameroon number without country code
            return `+237 ${cleanPhone.substring(0, 1)}${cleanPhone.substring(1, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6, 9)}`;
        }
        
        // For other international numbers, add + if missing
        if (cleanPhone.length >= 8 && !cleanPhone.startsWith('+')) {
            return `+${cleanPhone}`;
        }
        
        return cleanPhone;
    }, []);

    /**
     * Nettoie un numéro de téléphone pour le stockage
     * @param {string} phone - Le numéro à nettoyer
     * @returns {string} - Le numéro nettoyé
     */
    const cleanPhone = useCallback((phone) => {
        if (!phone) return '';
        
        // Keep only digits and +
        let cleaned = phone.replace(/[^+\d]/g, '');
        
        // Ensure + is only at the beginning
        if (cleaned.includes('+')) {
            const parts = cleaned.split('+');
            cleaned = '+' + parts.join('');
        }
        
        return cleaned;
    }, []);

    /**
     * Détecte le pays d'un numéro de téléphone
     * @param {string} phone - Le numéro à analyser
     * @returns {object} - { country: string, flag: string, code: string }
     */
    const detectCountry = useCallback((phone) => {
        if (!phone) return { country: 'Unknown', flag: '🌍', code: '' };
        
        const cleanPhone = phone.replace(/[^+\d]/g, '');
        
        if (cleanPhone.startsWith('+237') || cleanPhone.startsWith('237')) {
            return { country: 'Cameroun', flag: '🇨🇲', code: '+237' };
        } else if (cleanPhone.startsWith('+33') || cleanPhone.startsWith('33')) {
            return { country: 'France', flag: '🇫🇷', code: '+33' };
        } else if (cleanPhone.startsWith('+1')) {
            return { country: 'USA/Canada', flag: '🇺🇸', code: '+1' };
        } else if (cleanPhone.startsWith('+234')) {
            return { country: 'Nigeria', flag: '🇳🇬', code: '+234' };
        }
        
        return { country: 'International', flag: '🌍', code: '+' };
    }, []);

    /**
     * Suggestions de correction pour les numéros mal formatés
     * @param {string} phone - Le numéro mal formaté
     * @returns {array} - Liste de suggestions
     */
    const getSuggestions = useCallback((phone) => {
        if (!phone) return [];
        
        const suggestions = [];
        const cleanPhone = phone.replace(/[^\d]/g, '');
        
        // Si c'est 9 chiffres commençant par 6, suggérer +237
        if (cleanPhone.length === 9 && cleanPhone.startsWith('6')) {
            suggestions.push({
                formatted: `+237 ${cleanPhone.substring(0, 1)}${cleanPhone.substring(1, 3)} ${cleanPhone.substring(3, 6)} ${cleanPhone.substring(6, 9)}`,
                description: 'Numéro camerounais avec indicatif'
            });
        }
        
        // Si c'est 12 chiffres commençant par 237
        if (cleanPhone.length === 12 && cleanPhone.startsWith('237')) {
            const number = cleanPhone.substring(3);
            suggestions.push({
                formatted: `+237 ${number.substring(0, 1)}${number.substring(1, 3)} ${number.substring(3, 6)} ${number.substring(6, 9)}`,
                description: 'Numéro camerounais formaté'
            });
        }
        
        return suggestions;
    }, []);

    return {
        validatePhone,
        formatPhone,
        cleanPhone,
        detectCountry,
        getSuggestions,
        phoneError,
        setPhoneError
    };
};