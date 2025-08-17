import { host } from './fetch';
import { withRateLimit } from './rateLimiter';
import { authService } from '../services/authService';

/**
 * Configuration par défaut pour les requêtes API
 */
const DEFAULT_CONFIG = {
    timeout: 30000, // 30 secondes
    retries: 3,
    retryDelay: 1000, // 1 seconde
    maxRetryDelay: 10000, // 10 secondes maximuma
};

/**
 * Types d'erreurs personnalisées
 */
export class NetworkError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'NetworkError';
        this.status = status;
    }
}

export class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}

export class ValidationError extends Error {
    constructor(message, errors) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

/**
 * Fonction utilitaire pour créer un délai
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fonction utilitaire pour créer un timeout
 */
const withTimeout = (promise, timeoutMs) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new TimeoutError(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

/**
 * Gestionnaire d'erreurs centralisé
 */
export const handleApiError = (error, showUserMessage = true) => {
    console.error('API Error:', error);
    
    let userMessage = 'Une erreur inattendue s\'est produite';
    
    if (error instanceof NetworkError) {
        if (error.status === 401) {
            userMessage = 'Session expirée. Veuillez vous reconnecter.';
            // Rediriger vers la page de connexion
            if (typeof window !== 'undefined') {
                authService.removeToken();
                window.location.href = '/login';
                return;
            }
        } else if (error.status === 403) {
            userMessage = 'Vous n\'avez pas les permissions nécessaires.';
        } else if (error.status === 404) {
            userMessage = 'Ressource non trouvée.';
        } else if (error.status === 429) {
            userMessage = 'Trop de requêtes. Veuillez patienter un moment avant de réessayer.';
        } else if (error.status === 500) {
            userMessage = 'Erreur du serveur. Veuillez réessayer plus tard.';
        } else if (error.status >= 400) {
            userMessage = error.message || 'Erreur de requête.';
        }
    } else if (error instanceof TimeoutError) {
        userMessage = 'La requête a pris trop de temps. Vérifiez votre connexion.';
    } else if (error instanceof ValidationError) {
        userMessage = error.message || 'Données invalides.';
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        userMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    }
    
    if (showUserMessage && typeof window !== 'undefined') {
        // Utiliser une notification toast si disponible, sinon alert
        if (window.Swal) {
            window.Swal.fire({
                title: 'Erreur',
                text: userMessage,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } else {
            console.log(userMessage);
        }
    }
    
    return { error, userMessage };
};

/**
 * Fonction de fetch sécurisée avec gestion d'erreurs et retry
 */
export const safeFetch = async (url, options = {}, config = {}) => {
    const {
        timeout = DEFAULT_CONFIG.timeout,
        retries = DEFAULT_CONFIG.retries,
        retryDelay = DEFAULT_CONFIG.retryDelay,
        maxRetryDelay = DEFAULT_CONFIG.maxRetryDelay,
        // showUserMessage = true
    } = config;
    
    // Configuration par défaut des headers
    const token = authService.getToken();
    console.log('API Debug - Token found:', !!token);
    if (token) {
        console.log('Token preview:', token.substring(0, 20) + '...');
    }
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    const fetchOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    // Construire l'URL complète
    const fullUrl = url.startsWith('http') ? url : `${host}/api${url}`;
    
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Ajouter un délai entre les tentatives (sauf pour la première)
            if (attempt > 0) {
                // Délai exponentiel pour les erreurs 429, linéaire pour les autres
                const isRateLimitError = lastError instanceof NetworkError && lastError.status === 429;
                const delayTime = isRateLimitError 
                    ? Math.min(retryDelay * Math.pow(2, attempt), maxRetryDelay)
                    : retryDelay * attempt;
                
                console.log(`Waiting ${delayTime}ms before retry attempt ${attempt}...`);
                await delay(delayTime);
            }
            
            const response = await withTimeout(
                withRateLimit(() => fetch(fullUrl, fetchOptions)),
                timeout
            );
            
            // Vérifier si la réponse est OK
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new NetworkError(
                    errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                    response.status
                );
            }
            
            // Tenter de parser en JSON
            const data = await response.json();
            
            // Vérifier si l'API retourne une erreur dans les données
            if (data.success === false) {
                throw new ValidationError(data.message || 'Erreur de validation', data.errors);
            }
            
            return data;
            
        } catch (error) {
            lastError = error;
            
            // Ne pas retry pour certains types d'erreurs (sauf 429)
            if (error instanceof NetworkError && [401, 403, 404, 422].includes(error.status)) {
                break;
            }
            
            // Pour les erreurs 429, on continue à retry mais avec plus de délai
            if (error instanceof NetworkError && error.status === 429) {
                console.warn(`Rate limit hit (429), will retry with exponential backoff...`);
            }
            
            if (error instanceof ValidationError) {
                break;
            }
            
            // Si c'est la dernière tentative, on break
            if (attempt === retries) {
                break;
            }
            
            console.warn(`Attempt ${attempt + 1} failed, retrying...`, error.message);
        }
    }
    
    // Gérer l'erreur finale
    // const errorResult = handleApiError(lastError, showUserMessage);
    throw lastError;
};

/**
 * Méthodes de convenance pour les requêtes HTTP
 */
export const api = {
    get: (url, config = {}) => safeFetch(url, { method: 'GET' }, config),
    
    post: (url, data, config = {}) => safeFetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
    }, config),
    
    put: (url, data, config = {}) => safeFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    }, config),
    
    delete: (url, config = {}) => safeFetch(url, { method: 'DELETE' }, config),
    
    patch: (url, data, config = {}) => safeFetch(url, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }, config)
};

/**
 * Fonctions spécifiques pour l'application
 */
export const apiEndpoints = {
    // Authentication
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    
    //users
    getAdminOrTeacher: () => api.get(`/users/getTeacherOrAdmin`),
    getUserInfos: () => api.get('/users/getInfos'),
    getAllUsers: () => api.get('/users/all'),

    // Teachers
    getAllTeachers: () => api.get('/teachers/getAll'),
    getTeacher: (id) => api.get(`/teachers/${id}`),
    addTeacher: (data) => api.post('/teachers/add', data),
    updateTeacher: (id, data) => api.put(`/teachers/${id}`, data),
    deleteTeacher: (id) => api.delete(`/teachers/${id}`),
    regenerateTeacherPasswords: () => api.get('/teachers/regeneratePassword'),
    
    // Students
    getAllStudents: () => api.get('/students/getAll'),
    getStudentsByClass: (classId) => api.get(`/students/${classId}`),
    getOrderedStudents: (classId) => api.get(`/students/getOrdonnedStudents/${classId}`),
    getOneStudent: (id) => api.get(`/students/one/${id}`),
    addStudent: (classId, data) => api.post(`/students/add/${classId}`, data),
    updateStudent: (id, data) => api.put(`/students/${id}`, data),
    deleteStudent: (id) => api.delete(`/students/${id}`),
    getStudentSettings: () => api.get('/students/gs'),
    
    // Classes
    getAllClasses: () => api.get('/class/getAll'),
    getOneClass: (id) => api.get(`/class/${id}`),
    addClass: (data) => api.post('/class/add', data),
    updateClass: (id, data) => api.put(`/class/${id}`, data),
    deleteClass: (id) => api.delete(`/class/${id}`),
    
    // Sections
    getAllSections: () => api.get('/sections'),
    getOneSection: (id) => api.get(`/sections/${id}`),
    addSection: (data) => api.post('/sections/store', data),
    updateSection: (id, data) => api.put(`/sections/${id}`, data),
    deleteSection: (id) => api.delete(`/sections/${id}`),
    exportSections: (format, filters = {}) => {
        const params = new URLSearchParams(filters);
        return api.get(`/sections/export/${format}?${params}`);
    },
    importSections: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/sections/import/csv', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    
    // Sequences
    getAllSequences: () => api.get('/seq/getAll'),
    getOneSequence: (id) => api.get(`/seq/${id}`),
    addSequence: (data) => api.post('/seq/add', data),
    updateSequence: (id, data) => api.put(`/seq/${id}`, data),
    deleteSequence: (id) => api.delete(`/seq/${id}`),
    
    // Trimesters
    getAllTrimesters: () => api.get('/trim/getAll'),
    getOneTrimester: (id) => api.get(`/trim/${id}`),
    addTrimester: (data) => api.post('/trim/add', data),
    updateTrimester: (id, data) => api.put(`/trim/${id}`, data),
    deleteTrimester: (id) => api.delete(`/trim/${id}`),
    
    // Annual Exams
    getAllAnnualExams: () => api.get('/annuals/all'),
    getOneAnnualExam: (id) => api.get(`/annuals/${id}`),
    addAnnualExam: (data) => api.post('/annuals/add', data),
    updateAnnualExam: (id, data) => api.put(`/annuals/${id}`, data),
    deleteAnnualExam: (id) => api.delete(`/annuals/${id}`),
    
    // Settings
    getSettings: () => api.get('/settings/getSettings'),
    updateSettings: (data) => api.post('/settings/setSettings', data),
    
    // Payment Tranches
    getAllPaymentTranches: () => api.get('/payment-tranches'),
    getPaymentTranche: (id) => api.get(`/payment-tranches/${id}`),
    addPaymentTranche: (data) => api.post('/payment-tranches', data),
    updatePaymentTranche: (id, data) => api.put(`/payment-tranches/${id}`, data),
    deletePaymentTranche: (id) => api.delete(`/payment-tranches/${id}`),
    reorderPaymentTranches: (data) => api.post('/payment-tranches/reorder', data),
    
    // Levels
    getAllLevels: (sectionId = null) => {
        const url = sectionId ? `/levels?section_id=${sectionId}` : '/levels';
        return api.get(url);
    },
    getLevel: (id) => api.get(`/levels/${id}`),
    addLevel: (data) => api.post('/levels', data),
    updateLevel: (id, data) => api.put(`/levels/${id}`, data),
    deleteLevel: (id) => api.delete(`/levels/${id}`),
    
    // School Classes
    getAllSchoolClasses: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.section_id) params.append('section_id', filters.section_id);
        if (filters.level_id) params.append('level_id', filters.level_id);
        const url = params.toString() ? `/school-classes?${params}` : '/school-classes';
        return api.get(url);
    },
    getSchoolClass: (id) => api.get(`/school-classes/${id}`),
    addSchoolClass: (data) => api.post('/school-classes', data),
    updateSchoolClass: (id, data) => api.put(`/school-classes/${id}`, data),
    deleteSchoolClass: (id) => api.delete(`/school-classes/${id}`),
    configureClassPayments: (id, data) => api.post(`/school-classes/${id}/configure-payments`, data),
    exportSchoolClasses: (format, filters = {}) => {
        const params = new URLSearchParams(filters);
        return api.get(`/school-classes/export/${format}?${params}`);
    },
    importSchoolClasses: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/school-classes/import/csv', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Levels 
    exportLevels: (format, filters = {}) => {
        const params = new URLSearchParams(filters);
        return api.get(`/levels/export/${format}?${params}`);
    },
    importLevels: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/levels/import/csv', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Students
    exportStudents: (format, seriesId, filters = {}) => {
        const params = new URLSearchParams(filters);
        return api.get(`/students/export/${format}/${seriesId}?${params}`);
    },
    importStudents: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/students/import/csv', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

export default api;