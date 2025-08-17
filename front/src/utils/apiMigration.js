/**
 * Migration des anciens endpoints API vers le nouveau système d'authentification JWT
 * Ce fichier remplace progressivement l'ancien système basé sur sessionStorage.user
 */

import { authService } from '../services/authService';
import { host } from './fetch';

/**
 * Nouveau service API qui utilise automatiquement les tokens JWT
 */
class SecureApiService {
    constructor() {
        this.baseURL = `${host}/api`;
    }

    // Fonction de requête sécurisée personnalisée - VERSION AMÉLIORÉE
    async makeRequest(endpoint, options = {}) {
        const fullUrl = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        
        const token = authService.getToken();
        const headers = {
            'Accept': 'application/json',
            ...options.headers
        };

        // Ne pas ajouter Content-Type pour FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers
            });

            // Gestion des erreurs HTTP
            if (!response.ok) {
                let errorMessage = `Erreur HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } else {
                        const errorText = await response.text();
                        if (errorText) {
                            errorMessage = errorText;
                        }
                    }
                } catch (parseError) {
                    console.warn('Impossible de parser la réponse d\'erreur:', parseError);
                }
                
                // Gestion spéciale pour les erreurs 401
                if (response.status === 401) {
                    authService.removeToken();
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                    throw new Error('Session expirée. Veuillez vous reconnecter.');
                }
                
                throw new Error(errorMessage);
            }

            // Vérifier le type de contenu
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                
                if (!responseText.trim()) {
                    console.warn('Réponse JSON vide du serveur');
                    return { success: true };
                }
                
                try {
                    return JSON.parse(responseText);
                } catch (jsonError) {
                    console.error('Erreur de parsing JSON:', jsonError);
                    console.error('Contenu reçu:', responseText);
                    throw new Error('Format de réponse invalide du serveur');
                }
            } else {
                // Pour les réponses non-JSON (PDF, images, etc.)
                return response;
            }

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion.');
            }
            throw error;
        }
    }

    // Méthodes GET
    async get(endpoint, options = {}) {
        return await this.makeRequest(endpoint, {
            method: 'GET',
            ...options
        });
    }

    // Méthodes POST
    async post(endpoint, data = null, options = {}) {
        return await this.makeRequest(endpoint, {
            method: 'POST',
            body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : null,
            ...options
        });
    }

    // Méthodes PUT
    async put(endpoint, data = null, options = {}) {
        return await this.makeRequest(endpoint, {
            method: 'PUT',
            body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : null,
            ...options
        });
    }

    // Méthodes DELETE
    async delete(endpoint, options = {}) {
        return await this.makeRequest(endpoint, {
            method: 'DELETE',
            ...options
        });
    }

    // Méthodes PATCH
    async patch(endpoint, data = null, options = {}) {
        return await this.makeRequest(endpoint, {
            method: 'PATCH',
            body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : null,
            ...options
        });
    }
}

// Instance singleton
const secureApi = new SecureApiService();

/**
 * Nouveaux endpoints API avec authentification JWT
 * Remplace progressivement les anciens endpoints
 */
export const secureApiEndpoints = {
    // === AUTHENTICATION ===
    auth: {
        login: (credentials) => authService.login(credentials),
        logout: () => authService.logout(),
        refresh: () => authService.refreshToken(),
        me: () => authService.getCurrentUser(),
        updateProfile: (data) => secureApi.put('/users/profile', data),
        changePassword: (data) => secureApi.put('/auth/change-password', data),
        uploadAvatar: async (formData) => {
            const token = authService.getToken();
            
            try {
                const response = await fetch(`${secureApi.baseURL}/upload-photo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                        // Don't set Content-Type for FormData
                    },
                    body: formData
                });

                if (!response.ok) {
                    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
                    
                    try {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const errorData = await response.json();
                            errorMessage = errorData.message || errorData.error || errorMessage;
                        }
                    } catch (e) {
                        // Ignore JSON parsing errors
                    }
                    
                    throw new Error(errorMessage);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const result = await response.json();
                    return {
                        success: result.success,
                        message: result.message,
                        data: {
                            url: result.data?.url || null,
                            filename: result.data?.filename || null
                        }
                    };
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (error) {
                throw error;
            }
        }
    },

    // === USERS ===
    users: {
        getAll: () => secureApi.get('/users'),
        getById: (id) => secureApi.get(`/users/${id}`),
        create: (data) => secureApi.post('/users', data),
        update: (id, data) => secureApi.put(`/users/${id}`, data),
        delete: (id) => secureApi.delete(`/users/${id}`),
        getProfile: () => secureApi.get('/users/profile'),
        updateProfile: (data) => secureApi.put('/users/profile', data)
    },

    // === TEACHERS ===
    teachers: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teachers${queryString ? '?' + queryString : ''}`);
        },
        getById: (id) => secureApi.get(`/teachers/${id}`),
        create: (data) => secureApi.post('/teachers', data),
        update: (id, data) => secureApi.put(`/teachers/${id}`, data),
        delete: (id) => secureApi.delete(`/teachers/${id}`),
        toggleStatus: (id) => secureApi.post(`/teachers/${id}/toggle-status`),
        assignSubjects: (id, data) => secureApi.post(`/teachers/${id}/assign-subjects`, data),
        removeAssignment: (id, data) => secureApi.post(`/teachers/${id}/remove-assignment`, data),
        createUserAccount: (id, data) => secureApi.post(`/teachers/${id}/create-user-account`, data),
        removeUserAccount: (id) => secureApi.delete(`/teachers/${id}/remove-user-account`),
        getStats: (id, params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teachers/${id}/stats${queryString ? '?' + queryString : ''}`);
        }
    },

    // === SUBJECTS ===
    subjects: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/subjects${queryString ? '?' + queryString : ''}`);
        },
        getById: (id) => secureApi.get(`/subjects/${id}`),
        create: (data) => secureApi.post('/subjects', data),
        update: (id, data) => secureApi.put(`/subjects/${id}`, data),
        delete: (id) => secureApi.delete(`/subjects/${id}`),
        toggleStatus: (id) => secureApi.post(`/subjects/${id}/toggle-status`),
        getForSeries: (seriesId) => secureApi.get(`/subjects/series/${seriesId}`),
        configureForSeries: (seriesId, data) => secureApi.post(`/subjects/series/${seriesId}/configure`, data)
    },

    // === STUDENTS ===
    students: {
        getAll: () => secureApi.get('/students'),
        getByClass: (classId) => secureApi.get(`/students/class/${classId}`),
        getByClassSeries: (seriesId) => secureApi.get(`/students/class-series/${seriesId}`),
        getById: (id) => secureApi.get(`/students/${id}`),
        create: (data) => secureApi.post('/students', data),
        
        // VERSION AMÉLIORÉE avec meilleure gestion des erreurs JSON
        createWithPhoto: async (formData) => {
            const token = authService.getToken();
            
            try {
                const response = await fetch(`${secureApi.baseURL}/students`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                        // Don't set Content-Type - let browser set it with boundary for FormData
                    },
                    body: formData
                });

                // Vérifier d'abord si la réponse est ok
                if (!response.ok) {
                    // Essayer de récupérer le message d'erreur
                    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
                    
                    try {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const errorData = await response.json();
                            errorMessage = errorData.message || errorData.error || errorMessage;
                        } else {
                            // Si ce n'est pas du JSON, lire comme texte
                            const errorText = await response.text();
                            if (errorText) {
                                errorMessage = errorText;
                            }
                        }
                    } catch (parseError) {
                        console.warn('Impossible de parser la réponse d\'erreur:', parseError);
                    }
                    
                    throw new Error(errorMessage);
                }

                // Vérifier le type de contenu de la réponse
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.warn('La réponse du serveur n\'est pas au format JSON, type:', contentType);
                    // Essayer quand même de lire comme texte pour voir ce qu'on reçoit
                    const responseText = await response.text();
                    console.log('Contenu de la réponse non-JSON:', responseText);
                    
                    // Si c'est vide mais status 200/201, considérer comme succès
                    if (!responseText.trim() && (response.status === 200 || response.status === 201)) {
                        return { success: true, message: 'Étudiant créé avec succès' };
                    }
                    
                    throw new Error('La réponse du serveur n\'est pas au format JSON');
                }

                // Vérifier si le body existe
                const responseText = await response.text();
                if (!responseText || responseText.trim() === '') {
                    console.warn('Réponse vide du serveur mais status OK');
                    return { success: true, message: 'Étudiant créé avec succès' };
                }

                // Parser le JSON
                try {
                    return JSON.parse(responseText);
                } catch (jsonError) {
                    console.error('Erreur de parsing JSON:', jsonError);
                    console.error('Contenu de la réponse:', responseText);
                    throw new Error('Format de réponse invalide du serveur');
                }

            } catch (networkError) {
                if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
                    throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion.');
                }
                throw networkError;
            }
        },

        // Fonction de debug pour diagnostiquer les problèmes
        debugCreateStudent: async (formData) => {
            const token = authService.getToken();
            
            console.log('=== DEBUG CREATE STUDENT ===');
            console.log('Token présent:', !!token);
            console.log('FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value instanceof File ? `File(${value.name})` : value);
            }
            
            try {
                const response = await fetch(`${secureApi.baseURL}/students`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                console.log('Response received:');
                console.log('- Status:', response.status);
                console.log('- Status Text:', response.statusText);
                console.log('- Headers:', Object.fromEntries(response.headers.entries()));

                const responseText = await response.text();
                console.log('- Body length:', responseText.length);
                console.log('- Body content:', responseText);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}\nBody: ${responseText}`);
                }

                if (!responseText.trim()) {
                    console.warn('Empty response body');
                    return { success: true, debug: true };
                }

                return JSON.parse(responseText);

            } catch (error) {
                console.error('=== ERROR ===', error);
                throw error;
            }
        },

        update: (id, data) => secureApi.put(`/students/${id}`, data),
        updateStatus: (id, status) => secureApi.patch(`/students/${id}/status`, { student_status: status }),
        updateWithPhoto: (id, formData) => {
            const token = authService.getToken();
            return fetch(`${secureApi.baseURL}/students/${id}/update-with-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                    // Don't set Content-Type - let browser set it with boundary for FormData
                },
                body: formData
            }).then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP Error ${response.status}`);
                }
                return response.json();
            });
        },
        delete: (id) => secureApi.delete(`/students/${id}`),
        exportCsv: async (seriesId) => {
            const token = authService.getToken();
            const response = await fetch(`${secureApi.baseURL}/students/export-csv/${seriesId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/csv'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erreur lors de l\'export CSV');
            }
            
            return await response.blob();
        },
        exportPdf: async (seriesId) => {
            const token = authService.getToken();
            const response = await fetch(`${secureApi.baseURL}/students/export-pdf/${seriesId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/html'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erreur lors de l\'export PDF');
            }
            
            return response; // Retourner la réponse pour permettre .text()
        },
        importCsv: (formData, seriesId) => {
            const token = authService.getToken();
            
            // Utiliser la nouvelle route avec l'ID de série
            const endpoint = seriesId 
                ? `/students/series/${seriesId}/import`
                : `/students/import/csv`; // Fallback vers l'ancienne route
            
            return fetch(`${secureApi.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                    // Don't set Content-Type - let browser set it with boundary for FormData
                },
                body: formData
            }).then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP Error ${response.status}`);
                }
                return response.json();
            });
        },
        
        // Nouvelle méthode pour import Excel spécifique à une série
        importExcel: (formData, seriesId) => {
            const token = authService.getToken();
            
            // Utiliser la nouvelle route avec l'ID de série
            const endpoint = seriesId 
                ? `/students/series/${seriesId}/import`
                : `/students/import/excel`; // Fallback vers l'ancienne route
            
            return fetch(`${secureApi.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                    // Don't set Content-Type - let browser set it with boundary for FormData
                },
                body: formData
            }).then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP Error ${response.status}`);
                }
                return response.json();
            });
        },
        getSchoolYears: () => secureApi.get('/students/school-years'),
        transfer: (id, newClassId) => secureApi.post(`/students/${id}/transfer`, { class_id: newClassId }),
        transferToSeries: (id, newSeriesId) => secureApi.post(`/students/${id}/transfer-series`, { class_series_id: newSeriesId }),
        getOrdered: (classId) => secureApi.get(`/students/class/${classId}/ordered`),
        reorder: (data) => secureApi.post('/students/reorder', data),
        sortAlphabetically: (seriesId, data) => secureApi.post(`/students/class-series/${seriesId}/sort-alphabetically`, data)
    },

    // === CLASSES ===
    classes: {
        getAll: () => secureApi.get('/classes'),
        getById: (id) => secureApi.get(`/classes/${id}`),
        getBySection: (sectionId) => secureApi.get(`/classes/section/${sectionId}`),
        create: (data) => secureApi.post('/classes', data),
        update: (id, data) => secureApi.put(`/classes/${id}`, data),
        delete: (id) => secureApi.delete(`/classes/${id}`)
    },

    // === SECTIONS ===
    sections: {
        getAll: () => secureApi.get('/sections'),
        getById: (id) => secureApi.get(`/sections/${id}`),
        create: (data) => secureApi.post('/sections', data),
        update: (id, data) => secureApi.put(`/sections/${id}`, data),
        delete: (id) => secureApi.delete(`/sections/${id}`),
        getDashboard: () => secureApi.get('/sections/dashboard'),
        toggleStatus: (id) => secureApi.post(`/sections/${id}/toggle-status`)
    },

    // === LEVELS ===
    levels: {
        getAll: () => secureApi.get('/levels'),
        getById: (id) => secureApi.get(`/levels/${id}`),
        create: (data) => secureApi.post('/levels', data),
        update: (id, data) => secureApi.put(`/levels/${id}`, data),
        delete: (id) => secureApi.delete(`/levels/${id}`),
        getDashboard: () => secureApi.get('/levels/dashboard'),
        toggleStatus: (id) => secureApi.post(`/levels/${id}/toggle-status`),
        getBySection: (sectionId) => secureApi.get(`/levels?section_id=${sectionId}`)
    },

    // === SCHOOL CLASSES ===
    schoolClasses: {
        getAll: () => secureApi.get('/school-classes'),
        getById: (id) => secureApi.get(`/school-classes/${id}`),
        create: (data) => secureApi.post('/school-classes', data),
        update: (id, data) => secureApi.put(`/school-classes/${id}`, data),
        delete: (id) => secureApi.delete(`/school-classes/${id}`),
        getDashboard: () => secureApi.get('/school-classes/dashboard'),
        toggleStatus: (id) => secureApi.post(`/school-classes/${id}/toggle-status`),
        configurePayments: (id, data) => secureApi.post(`/school-classes/${id}/configure-payments`, data),
        getByLevel: (levelId) => secureApi.get(`/school-classes?level_id=${levelId}`),
        getBySection: (sectionId) => secureApi.get(`/school-classes?section_id=${sectionId}`)
    },

    // === GRADES ===
    grades: {
        getByStudent: (studentId) => secureApi.get(`/grades/student/${studentId}`),
        getByClass: (classId) => secureApi.get(`/grades/class/${classId}`),
        create: (data) => secureApi.post('/grades', data),
        update: (id, data) => secureApi.put(`/grades/${id}`, data),
        delete: (id) => secureApi.delete(`/grades/${id}`)
    },

    // === PAYMENT TRANCHES ===
    paymentTranches: {
        getAll: () => secureApi.get('/payment-tranches'),
        getById: (id) => secureApi.get(`/payment-tranches/${id}`),
        create: (data) => secureApi.post('/payment-tranches', data),
        update: (id, data) => secureApi.put(`/payment-tranches/${id}`, data),
        delete: (id) => secureApi.delete(`/payment-tranches/${id}`),
        reorder: (data) => secureApi.post('/payment-tranches/reorder', data),
        getUsageStats: (id) => secureApi.get(`/payment-tranches/${id}/usage-stats`)
    },

    // === SETTINGS ===
    settings: {
        get: () => secureApi.get('/settings'),
        update: (data) => secureApi.put('/settings', data)
    },

    // === REPORTS ===
    reports: {
        getBulletin: (studentId, period) => secureApi.get(`/reports/bulletin/${studentId}/${period}`),
        getClassReport: (classId) => secureApi.get(`/reports/class/${classId}`),
        getFinancialReport: (period) => secureApi.get(`/reports/financial/${period}`),
        getInsolvableReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/insolvable?${queryString}`);
        },
        getPaymentsReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/payments?${queryString}`);
        },
        getRameReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/rame?${queryString}`);
        },
        getRecoveryReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/recovery?${queryString}`);
        },
        getCollectionSummaryReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/collection-summary?${queryString}`);
        },
        getPaymentDetailsReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/payment-details?${queryString}`);
        },
        getScholarshipsDiscountsReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/scholarships-discounts?${queryString}`);
        },
        getCollectionDetailsReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/collection-details?${queryString}`);
        },
        getSeriesCollectionSummary: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/series-collection-summary?${queryString}`);
        },
        getSchoolFeePaymentDetails: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/school-fee-payment-details?${queryString}`);
        },
        getDetailedCollectionReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/detailed-collection?${queryString}`);
        },
        getClassSchoolFeesReport: (params) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/reports/class-school-fees?${queryString}`);
        },
        exportPdf: async (params) => {
            const queryString = new URLSearchParams(params).toString();
            const token = authService.getToken();
            const response = await fetch(`${secureApi.baseURL}/reports/export-pdf?${queryString}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/html'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erreur lors de l\'export PDF');
            }
            
            const htmlContent = await response.text();
            return { success: true, data: htmlContent };
        }
    },

    // === SEARCH ===
    search: {
        global: (query, limit = 20) => secureApi.get(`/search?query=${encodeURIComponent(query)}&limit=${limit}`),
        quick: (query) => secureApi.get(`/search/quick?query=${encodeURIComponent(query)}`)
    },

    // === STATISTICS ===
    stats: {
        getGlobal: () => secureApi.get('/stats/global')
    },

    // === ACCOUNTANT ===
    accountant: {
        dashboard: () => secureApi.get('/accountant/dashboard'),
        getClasses: () => secureApi.get('/accountant/classes'),
        getClassSeries: (classId) => secureApi.get(`/accountant/classes/${classId}/series`),
        getSeriesStudents: (seriesId) => secureApi.get(`/accountant/series/${seriesId}/students`),
        getStudent: (studentId) => secureApi.get(`/accountant/students/${studentId}`)
    },

    // === SCHOOL YEARS ===
    schoolYears: {
        getAll: () => secureApi.get('/school-years'),
        create: (data) => secureApi.post('/school-years', data),
        update: (id, data) => secureApi.put(`/school-years/${id}`, data),
        setCurrent: (id) => secureApi.post(`/school-years/${id}/set-current`),
        getActive: () => secureApi.get('/school-years/active'),
        getActiveYears: () => secureApi.get('/school-years/active'),
        getUserWorkingYear: () => secureApi.get('/school-years/user-working-year'),
        setUserWorkingYear: (yearId) => secureApi.post('/school-years/set-user-working-year', { school_year_id: yearId })
    },

    // === PAYMENTS ===
    payments: {
        getStudentInfo: (studentId) => secureApi.get(`/payments/student/${studentId}/info`),
        getStudentInfoWithDiscount: (studentId) => secureApi.get(`/payments/student/${studentId}/info-with-discount`),
        getStudentHistory: (studentId) => secureApi.get(`/payments/student/${studentId}/history`),
        calculateWithDate: (studentId, data) => secureApi.post(`/payments/student/${studentId}/calculate-with-date`, data),
        create: (data) => secureApi.post('/payments', data),
        generateReceipt: (paymentId) => secureApi.get(`/payments/${paymentId}/receipt`),
        getStats: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/payments/stats${queryString ? '?' + queryString : ''}`);
        }
    },

    // === STUDENT RAME (Simplified) ===
    studentRame: {
        getStatus: (studentId) => secureApi.get(`/student-rame/student/${studentId}/status`),
        updateStatus: (studentId, data) => secureApi.post(`/student-rame/student/${studentId}/update`, data),
        getClassStatus: (classSeriesId) => secureApi.get(`/student-rame/class-series/${classSeriesId}`)
    },

    // === SCHOOL SETTINGS ===
    schoolSettings: {
        get: () => secureApi.get('/school-settings'),
        update: (data) => {
            // Si c'est un FormData (avec logo), utiliser une requête multipart
            if (data instanceof FormData) {
                // Ajouter _method=PUT pour simuler PUT avec POST
                data.append('_method', 'PUT');
                
                const token = authService.getToken();
                return fetch(`${secureApi.baseURL}/school-settings`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                        // Ne pas définir Content-Type pour FormData
                    },
                    body: data
                }).then(async response => {
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `HTTP Error ${response.status}`);
                    }
                    return response.json();
                });
            } else {
                return secureApi.put('/school-settings', data);
            }
        },
        getLogo: () => secureApi.get('/school-settings/logo'),
        testWhatsApp: () => secureApi.post('/school-settings/test-whatsapp')
    },

    // === CLASS SCHOLARSHIPS ===
    scholarships: {
        getAll: () => secureApi.get('/class-scholarships'),
        getById: (id) => secureApi.get(`/class-scholarships/${id}`),
        getByClass: (classId) => secureApi.get(`/class-scholarships/class/${classId}`),
        create: (data) => secureApi.post('/class-scholarships', data),
        update: (id, data) => secureApi.put(`/class-scholarships/${id}`, data),
        delete: (id) => secureApi.delete(`/class-scholarships/${id}`)
    },

    // === SERIES SUBJECTS ===
    seriesSubjects: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/series-subjects${queryString ? '?' + queryString : ''}`);
        },
        getByClass: (classId) => secureApi.get(`/series-subjects/class/${classId}`),
        create: (data) => secureApi.post('/series-subjects', data),
        update: (id, data) => secureApi.put(`/series-subjects/${id}`, data),
        delete: (id) => secureApi.delete(`/series-subjects/${id}`),
        toggleStatus: (id) => secureApi.post(`/series-subjects/${id}/toggle-status`),
        bulkConfigure: (classId, data) => secureApi.post(`/series-subjects/class/${classId}/bulk-configure`, data)
    },

    // === TEACHER ASSIGNMENTS ===
    teacherAssignments: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-assignments${queryString ? '?' + queryString : ''}`);
        },
        getByTeacher: (teacherId, params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-assignments/teacher/${teacherId}${queryString ? '?' + queryString : ''}`);
        },
        getAvailableSubjects: (teacherId, params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-assignments/teacher/${teacherId}/available-subjects${queryString ? '?' + queryString : ''}`);
        },
        create: (data) => secureApi.post('/teacher-assignments', data),
        delete: (id) => secureApi.delete(`/teacher-assignments/${id}`),
        toggleStatus: (id) => secureApi.post(`/teacher-assignments/${id}/toggle-status`),
        bulkAssign: (teacherId, data) => secureApi.post(`/teacher-assignments/teacher/${teacherId}/bulk-assign`, data)
    },

    // === MAIN TEACHERS ===
    mainTeachers: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/main-teachers${queryString ? '?' + queryString : ''}`);
        },
        getClassesWithoutMainTeacher: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/main-teachers/classes-without-main-teacher${queryString ? '?' + queryString : ''}`);
        },
        getAvailableTeachers: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/main-teachers/available-teachers${queryString ? '?' + queryString : ''}`);
        },
        create: (data) => secureApi.post('/main-teachers', data),
        update: (id, data) => secureApi.put(`/main-teachers/${id}`, data),
        delete: (id) => secureApi.delete(`/main-teachers/${id}`),
        toggleStatus: (id) => secureApi.post(`/main-teachers/${id}/toggle-status`)
    },

    // === NEEDS ===
    needs: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/needs${queryString ? '?' + queryString : ''}`);
        },
        getMyNeeds: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/needs/my-needs${queryString ? '?' + queryString : ''}`);
        },
        getById: (id) => secureApi.get(`/needs/${id}`),
        create: (data) => secureApi.post('/needs', data),
        update: (id, data) => secureApi.put(`/needs/${id}`, data),
        delete: (id) => secureApi.delete(`/needs/${id}`),
        approve: (id) => secureApi.post(`/needs/${id}/approve`),
        reject: (id, data) => secureApi.post(`/needs/${id}/reject`, data),
        getStatistics: () => secureApi.get('/needs/statistics/summary'),
        testWhatsApp: () => secureApi.post('/needs/test-whatsapp'),
        
        // Exports
        exportPdf: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return `${secureApi.baseURL}/needs/export/pdf${queryString ? '?' + queryString : ''}?token=${authService.getToken()}`;
        },
        exportExcel: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return `${secureApi.baseURL}/needs/export/excel${queryString ? '?' + queryString : ''}?token=${authService.getToken()}`;
        },
        exportWord: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return `${secureApi.baseURL}/needs/export/word${queryString ? '?' + queryString : ''}?token=${authService.getToken()}`;
        }
    },

    // === DOCUMENTS ===
    documents: {
        // Dossiers
        folders: {
            getAll: (params = {}) => {
                const queryString = new URLSearchParams(params).toString();
                return secureApi.get(`/documents/folders${queryString ? '?' + queryString : ''}`);
            },
            getTree: () => secureApi.get('/documents/folders/tree'),
            getTypes: () => secureApi.get('/documents/folders/types'),
            search: (query) => secureApi.get(`/documents/folders/search?query=${encodeURIComponent(query)}`),
            getById: (id) => secureApi.get(`/documents/folders/${id}`),
            create: (data) => secureApi.post('/documents/folders', data),
            update: (id, data) => secureApi.put(`/documents/folders/${id}`, data),
            delete: (id) => secureApi.delete(`/documents/folders/${id}`)
        },
        // Documents
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/documents${queryString ? '?' + queryString : ''}`);
        },
        getStatistics: () => secureApi.get('/documents/statistics'),
        getTypes: () => secureApi.get('/documents/types'),
        getVisibilityTypes: () => secureApi.get('/documents/visibility-types'),
        getById: (id) => secureApi.get(`/documents/${id}`),
        upload: (formData) => secureApi.post('/documents', formData),
        update: (id, data) => secureApi.put(`/documents/${id}`, data),
        delete: (id) => secureApi.delete(`/documents/${id}`),
        download: (id) => secureApi.get(`/documents/${id}/download`, { responseType: 'blob' }),
        toggleArchive: (id) => secureApi.post(`/documents/${id}/toggle-archive`)
    },

    // === USER MANAGEMENT ===
    userManagement: {
        getAll: () => secureApi.get('/user-management'),
        getStats: () => secureApi.get('/user-management/stats'),
        getById: (id) => secureApi.get(`/user-management/${id}`),
        create: (data) => secureApi.post('/user-management', data),
        update: (id, data) => secureApi.put(`/user-management/${id}`, data),
        resetPassword: (id) => secureApi.post(`/user-management/${id}/reset-password`),
        toggleStatus: (id) => secureApi.post(`/user-management/${id}/toggle-status`),
        delete: (id) => secureApi.delete(`/user-management/${id}`),
        uploadPhoto: (formData) => {
            const token = authService.getToken();
            return fetch(`${secureApi.baseURL}/upload-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                    // Ne pas définir Content-Type pour FormData
                },
                body: formData
            }).then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP Error ${response.status}`);
                }
                return response.json();
            });
        },
        
        // Nouvelle fonctionnalité: cartes d'identité professionnelles
        generateProfessionalCard: (id) => {
            const token = authService.getToken();
            return fetch(`${secureApi.baseURL}/user-management/${id}/professional-card`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf'
                }
            }).then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `Erreur ${response.status}`);
                }
                return response.blob();
            });
        },
        
        getUserQR: (id) => secureApi.get(`/user-management/${id}/qr-code`)
    },

    // === SUPERVISORS & ATTENDANCE ===
    supervisors: {
        // Gestion des affectations (admin uniquement)
        assignToClass: (data) => secureApi.post('/supervisors/assign-to-class', data),
        getAllAssignments: () => secureApi.get('/supervisors/all-assignments'),
        deleteAssignment: (assignmentId) => secureApi.delete(`/supervisors/assignments/${assignmentId}`),
        getSupervisorAssignments: (supervisorId) => secureApi.get(`/supervisors/${supervisorId}/assignments`),
        getAvailableClasses: (supervisorId) => secureApi.get(`/supervisors/${supervisorId}/available-classes`),
        
        // Scanner QR et présences
        scanQR: (data) => secureApi.post('/supervisors/scan-qr', data),
        getDailyAttendance: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/supervisors/daily-attendance${queryString ? '?' + queryString : ''}`);
        },
        getAttendanceRange: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/supervisors/attendance-range${queryString ? '?' + queryString : ''}`);
        },
        getEntryExitStats: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/supervisors/entry-exit-stats${queryString ? '?' + queryString : ''}`);
        },
        getStudentCurrentStatus: (data) => secureApi.post('/supervisors/student-status', data),
        markAbsentStudents: (data) => secureApi.post('/supervisors/mark-absent-students', data),
        markAllAbsentStudents: (data) => secureApi.post('/supervisors/mark-all-absent-students', data),
        
        // Génération QR codes
        generateStudentQR: (studentId) => secureApi.get(`/supervisors/generate-qr/${studentId}`),
        generateAllQRs: () => secureApi.get('/supervisors/generate-all-qrs')
    },

    // === TEACHER ATTENDANCE ===
    teacherAttendance: {
        // Scanner QR et présences enseignants
        scanQR: (data) => secureApi.post('/teacher-attendance/scan-qr', data),
        getDailyAttendance: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-attendance/daily-attendance${queryString ? '?' + queryString : ''}`);
        },
        getEntryExitStats: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-attendance/entry-exit-stats${queryString ? '?' + queryString : ''}`);
        },
        
        // Gestion des QR codes enseignants
        generateQRCode: (data) => secureApi.post('/teacher-attendance/generate-qr', data),
        getTeachersWithQR: () => secureApi.get('/teacher-attendance/teachers-with-qr'),
        
        // Rapports et statistiques
        getTeacherReport: (teacherId, params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-attendance/teacher/${teacherId}/report${queryString ? '?' + queryString : ''}`);
        },
        getDetailedTeacherStats: (teacherId, params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-attendance/teacher/${teacherId}/detailed-stats${queryString ? '?' + queryString : ''}`);
        },
        getDayMovements: (teacherId, params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/teacher-attendance/teacher/${teacherId}/day-movements${queryString ? '?' + queryString : ''}`);
        },
        updateWorkSchedule: (teacherId, data) => secureApi.put(`/teacher-attendance/teacher/${teacherId}/work-schedule`, data)
    },


    // === INVENTORY ===
    inventory: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/inventory${queryString ? '?' + queryString : ''}`);
        },
        getDashboard: () => secureApi.get('/inventory/dashboard'),
        getConfig: () => secureApi.get('/inventory/config'),
        getById: (id) => secureApi.get(`/inventory/${id}`),
        create: (data) => secureApi.post('/inventory', data),
        update: (id, data) => secureApi.put(`/inventory/${id}`, data),
        delete: (id) => secureApi.delete(`/inventory/${id}`),
        updateQuantity: (id, data) => secureApi.patch(`/inventory/${id}/quantity`, data),
        getMovements: (id) => secureApi.get(`/inventory/${id}/movements`),
        recordMovement: (id, data) => secureApi.post(`/inventory/${id}/movements`, data),
        exportData: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return secureApi.get(`/inventory/export${queryString ? '?' + queryString : ''}`);
        },
        importData: (formData) => {
            const token = authService.getToken();
            return fetch(`${secureApi.baseURL}/inventory/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                    // Ne pas définir Content-Type pour FormData
                },
                body: formData
            }).then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP Error ${response.status}`);
                }
                return response.json();
            });
        },
        getLowStockItems: () => secureApi.get('/inventory/low-stock'),
        testWhatsApp: () => secureApi.post('/inventory/test-whatsapp')
    }
};

/**
 * Wrapper de migration pour compatibilité avec l'ancien système
 * Permet une migration progressive des composants
 */
export const createMigrationWrapper = (oldEndpoint, newEndpoint) => {
    return async (...args) => {
        try {
            // Essayer d'abord le nouveau système
            return await newEndpoint(...args);
        } catch (error) {
            console.warn(`Nouveau endpoint échoué, utilisation de l'ancien système:`, error);
            // Fallback vers l'ancien système si nécessaire
            return await oldEndpoint(...args);
        }
    };
};

/**
 * Utilitaires de migration
 */
export const migrationUtils = {
    // Nettoyer l'ancien stockage
    cleanOldStorage: () => {
        try {
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('stat');
            sessionStorage.removeItem('classId');
            localStorage.removeItem('user');
            localStorage.removeItem('stat');
        } catch (error) {
            console.error('Erreur lors du nettoyage du stockage:', error);
        }
    },

    // Migrer les données utilisateur si présentes
    migrateUserData: () => {
        try {
            const oldUser = sessionStorage.getItem('user');
            const oldStatus = sessionStorage.getItem('stat');
            
            if (oldUser && oldStatus) {
                console.log('Anciennes données utilisateur détectées, migration recommandée');
                // Ici vous pourriez implémenter une logique de migration
                return { token: oldUser, status: oldStatus };
            }
        } catch (error) {
            console.error('Erreur lors de la migration des données:', error);
        }
        return null;
    },

    // Vérifier si une migration est nécessaire
    needsMigration: () => {
        const hasOldData = !!(sessionStorage.getItem('user') || localStorage.getItem('user'));
        const hasNewData = !!authService.getToken();
        
        return hasOldData && !hasNewData;
    },

    // === CONVENIENCE METHODS ===
    getTeachers: (params = {}) => secureApiEndpoints.teachers.getAll(params),
    getSubjects: (params = {}) => secureApiEndpoints.subjects.getAll(params)
};

export { secureApi };
export default secureApiEndpoints;
