/**
 * Utilitaire pour gérer les erreurs API de manière cohérente
 */

/**
 * Extrait le message d'erreur le plus approprié d'une réponse d'erreur
 * @param {Error|Object} error - L'erreur capturée
 * @param {string} defaultMessage - Message par défaut si aucun message spécifique n'est trouvé
 * @returns {string} Le message d'erreur à afficher à l'utilisateur
 */
export function extractErrorMessage(error, defaultMessage = 'Une erreur est survenue') {
    console.error('Erreur API:', error);
    
    // Si l'erreur a un message direct
    if (error.message) {
        return error.message;
    }
    
    // Si l'erreur provient d'une réponse HTTP avec des données
    if (error.response && error.response.data) {
        const data = error.response.data;
        
        // Message principal
        if (data.message) {
            return data.message;
        }
        
        // Erreurs de validation Laravel
        if (data.errors) {
            const firstErrorKey = Object.keys(data.errors)[0];
            if (firstErrorKey && data.errors[firstErrorKey][0]) {
                return data.errors[firstErrorKey][0];
            }
        }
        
        // Erreur générique
        if (data.error) {
            return data.error;
        }
    }
    
    // Si c'est un objet d'erreur fetch/axios
    if (error.status || error.statusText) {
        return `Erreur ${error.status || ''}: ${error.statusText || 'Erreur de réseau'}`;
    }
    
    return defaultMessage;
}

/**
 * Gère une erreur API et retourne un objet avec le statut et le message
 * @param {Error|Object} error - L'erreur capturée
 * @param {string} defaultMessage - Message par défaut
 * @returns {Object} { success: false, message: string }
 */
export function handleApiError(error, defaultMessage = 'Une erreur est survenue') {
    const message = extractErrorMessage(error, defaultMessage);
    return {
        success: false,
        message: message
    };
}

/**
 * Wrapper pour les appels API qui gère automatiquement les erreurs
 * @param {Function} apiCall - La fonction d'appel API
 * @param {string} defaultErrorMessage - Message d'erreur par défaut
 * @returns {Promise} Résultat de l'appel API ou erreur formatée
 */
export async function safeApiCall(apiCall, defaultErrorMessage = 'Une erreur est survenue') {
    try {
        const result = await apiCall();
        return result;
    } catch (error) {
        return handleApiError(error, defaultErrorMessage);
    }
}