import { host } from '../utils/fetch';

class AuthService {
    constructor() {
        this.baseURL = `${host}/api/auth`;
        this.tokenKey = 'auth_token';
        this.userKey = 'user_data';
    }

    // Configuration des headers par défaut
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    // Gestion sécurisée du stockage des tokens
    setToken(token) {
        try {
            // Utiliser localStorage pour la persistance (plus sécurisé que sessionStorage pour les tokens)
            localStorage.setItem(this.tokenKey, token);
            
            // Optionnel: chiffrer le token avant stockage pour plus de sécurité
            // const encryptedToken = this.encryptToken(token);
            // localStorage.setItem(this.tokenKey, encryptedToken);
        } catch (error) {
            console.error('Erreur lors du stockage du token:', error);
        }
    }

    getToken() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            // Optionnel: déchiffrer le token si chiffré
            // return token ? this.decryptToken(token) : null;
            return token;
        } catch (error) {
            console.error('Erreur lors de la récupération du token:', error);
            return null;
        }
    }

    removeToken() {
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            sessionStorage.clear(); // Nettoyer aussi sessionStorage
        } catch (error) {
            console.error('Erreur lors de la suppression du token:', error);
        }
    }

    // Vérifier si le token est expiré
    isTokenExpired(token = null) {
        const currentToken = token || this.getToken();
        
        if (!currentToken) return true;

        try {
            const payload = JSON.parse(atob(currentToken.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Vérifier si le token expire dans les 5 prochaines minutes
            return payload.exp < (currentTime + 300);
        } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
            return true;
        }
    }

    // Fonction de requête avec gestion d'erreurs
    async makeRequest(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers: {
                    ...this.getHeaders(options.includeAuth !== false),
                    ...options.headers
                }
            });

            // Gestion des erreurs HTTP
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Gestion spéciale pour les erreurs 401
                if (response.status === 401) {
                    // Ne déclencher la déconnexion automatique que pour les requêtes authentifiées
                    // Pas pour les tentatives de login (qui ont includeAuth = false)
                    if (options.includeAuth !== false) {
                        this.removeToken();
                        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                        throw new Error('Session expirée. Veuillez vous reconnecter.');
                    }
                    // Pour les erreurs de login, laisser passer l'erreur normale
                }
                
                throw new Error(
                    errorData.message || 
                    errorData.error || 
                    `Erreur HTTP ${response.status}: ${response.statusText}`
                );
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion.');
            }
            throw error;
        }
    }

    // Connexion utilisateur
    async login(credentials) {
        try {
            const response = await this.makeRequest('/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: credentials.username.trim(),
                    password: credentials.password
                }),
                includeAuth: false
            });

            if (response.access_token && response.user) {
                // Stocker le token et les informations utilisateur
                this.setToken(response.access_token);
                localStorage.setItem(this.userKey, JSON.stringify(response.user));
                
                return response;
            } else {
                throw new Error('Réponse invalide du serveur');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error;
        }
    }

    // Inscription utilisateur (si nécessaire)
    async register(userData) {
        try {
            const response = await this.makeRequest('/register', {
                method: 'POST',
                body: JSON.stringify(userData),
                includeAuth: false
            });

            return response;
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            throw error;
        }
    }

    // Déconnexion
    async logout() {
        try {
            await this.makeRequest('/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            // Continuer la déconnexion même en cas d'erreur serveur
        } finally {
            this.removeToken();
        }
    }

    // Refresh du token
    async refreshToken() {
        try {
            const response = await this.makeRequest('/refresh', {
                method: 'POST'
            });

            if (response.access_token) {
                // Mettre à jour les informations utilisateur si présentes
                if (response.user) {
                    localStorage.setItem(this.userKey, JSON.stringify(response.user));
                }
                
                return response;
            } else {
                throw new Error('Impossible de renouveler le token');
            }
        } catch (error) {
            console.error('Erreur lors du refresh du token:', error);
            this.removeToken();
            throw error;
        }
    }

    // Obtenir les informations de l'utilisateur actuel
    async getCurrentUser() {
        try {
            const response = await this.makeRequest('/me', {
                method: 'GET'
            });

            if (response) {
                localStorage.setItem(this.userKey, JSON.stringify(response));
                return response;
            } else {
                throw new Error('Impossible de récupérer les informations utilisateur');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur:', error);
            throw error;
        }
    }

    // Obtenir les données utilisateur du cache local
    getCachedUser() {
        try {
            const userData = localStorage.getItem(this.userKey);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Erreur lors de la récupération des données utilisateur en cache:', error);
            return null;
        }
    }

    // Vérifier si l'utilisateur est authentifié
    isAuthenticated() {
        const token = this.getToken();
        return token && !this.isTokenExpired(token);
    }

    // Obtenir le rôle de l'utilisateur
    getUserRole() {
        const user = this.getCachedUser();
        return user?.role || null;
    }

    // Vérifier si l'utilisateur a un rôle spécifique
    hasRole(role) {
        return this.getUserRole() === role;
    }

    // Vérifier si l'utilisateur a l'un des rôles spécifiés
    hasAnyRole(roles) {
        const userRole = this.getUserRole();
        return roles.includes(userRole);
    }

    // Intercepteur pour les requêtes automatiques
    setupInterceptors() {
        // Intercepter toutes les requêtes fetch pour ajouter automatiquement le token
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Vérifier si c'est une requête vers notre API
            if (url.includes(host) || url.startsWith('/api')) {
                const token = this.getToken();
                
                if (token && !this.isTokenExpired(token)) {
                    options.headers = {
                        ...options.headers,
                        'Authorization': `Bearer ${token}`
                    };
                }
            }
            
            return originalFetch(url, options);
        };
    }

    // Restaurer les intercepteurs (si nécessaire)
    restoreInterceptors() {
        // Restaurer le fetch original si modifié
        if (window.originalFetch) {
            window.fetch = window.originalFetch;
            delete window.originalFetch;
        }
    }
}

// Instance singleton du service d'authentification
export const authService = new AuthService();

// Initialiser les intercepteurs au chargement
if (typeof window !== 'undefined') {
    authService.setupInterceptors();
}

export default authService;