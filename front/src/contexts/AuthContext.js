import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    refreshTokenTimeout: null,
    isLoggingOut: false
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
                error: null
            };

        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
                error: null
            };

        case 'LOGIN_FAILURE':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload
            };

        case 'LOGOUT_START':
            return {
                ...state,
                isLoggingOut: true
            };

        case 'LOGOUT':
            return {
                ...initialState,
                isLoading: false
            };

        case 'TOKEN_REFRESHED':
            return {
                ...state,
                token: action.payload.token,
                user: action.payload.user || state.user,
                error: null
            };

        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                isLoading: false
            };

        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null
            };

        case 'SET_REFRESH_TIMEOUT':
            return {
                ...state,
                refreshTokenTimeout: action.payload
            };

        case 'CLEAR_REFRESH_TIMEOUT':
            if (state.refreshTokenTimeout) {
                clearTimeout(state.refreshTokenTimeout);
            }
            return {
                ...state,
                refreshTokenTimeout: null
            };

        case 'UPDATE_USER':
            return {
                ...state,
                user: action.payload
            };

        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Fonction pour configurer le refresh automatique du token
    const setupTokenRefresh = (token) => {
        try {
            // Décoder le JWT pour obtenir l'expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiresAt = payload.exp * 1000; // Convertir en millisecondes
            const now = Date.now();
            const timeUntilExpiry = expiresAt - now;
            
            // Programmer le refresh 5 minutes avant l'expiration
            const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 0);
            
            if (refreshTime > 0) {
                const timeoutId = setTimeout(() => {
                    refreshToken();
                }, refreshTime);
                
                dispatch({ type: 'SET_REFRESH_TIMEOUT', payload: timeoutId });
            }
        } catch (error) {
            console.error('Erreur lors du décodage du token:', error);
        }
    };

    // Fonction de connexion
    const login = async (credentials) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });

        try {
            const response = await authService.login(credentials);
            
            if (response.access_token && response.user) {
                // Stocker le token de manière sécurisée
                authService.setToken(response.access_token);
                
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: {
                        user: response.user,
                        token: response.access_token
                    }
                });

                // Configurer le refresh automatique
                setupTokenRefresh(response.access_token);

                return response;
            } else {
                throw new Error('Réponse invalide du serveur');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.error || 
                                error.message || 
                                'Erreur de connexion';
            
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: errorMessage
            });
            
            throw error;
        }
    };

    // Fonction de déconnexion
    const logout = async () => {
        // Éviter les appels multiples de logout
        if (state.isLoggingOut) {
            console.log('Logout déjà en cours, ignorer');
            return;
        }
        
        dispatch({ type: 'LOGOUT_START' });
        dispatch({ type: 'CLEAR_REFRESH_TIMEOUT' });
        
        try {
            await authService.logout();
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        } finally {
            authService.removeToken();
            dispatch({ type: 'LOGOUT' });
        }
    };

    // Fonction de refresh du token
    const refreshToken = async () => {
        try {
            const response = await authService.refreshToken();
            
            if (response.access_token) {
                authService.setToken(response.access_token);
                
                dispatch({
                    type: 'TOKEN_REFRESHED',
                    payload: {
                        token: response.access_token,
                        user: response.user
                    }
                });

                // Configurer le prochain refresh
                setupTokenRefresh(response.access_token);
                
                return response.access_token;
            }
        } catch (error) {
            console.error('Erreur lors du refresh du token:', error);
            logout(); // Forcer la déconnexion si le refresh échoue
            throw error;
        }
    };

    // Fonction pour obtenir les informations utilisateur
    const getCurrentUser = async () => {
        try {
            const user = await authService.getCurrentUser();
            dispatch({
                type: 'TOKEN_REFRESHED',
                payload: { user, token: state.token }
            });
            return user;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error);
            throw error;
        }
    };

    // Fonction pour vérifier si l'utilisateur a un rôle spécifique
    const hasRole = (role) => {
        return state.user?.role === role;
    };

    // Fonction pour vérifier si l'utilisateur a l'un des rôles spécifiés
    const hasAnyRole = (roles) => {
        return roles.includes(state.user?.role);
    };

    // Fonction pour nettoyer les erreurs
    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    // Fonction pour mettre à jour l'utilisateur
    const updateUser = (userData) => {
        dispatch({ type: 'UPDATE_USER', payload: userData });
    };

    // Vérification de l'authentification au chargement
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = authService.getToken();
                
                if (token) {
                    // Vérifier d'abord si le token n'est pas expiré côté client
                    if (authService.isTokenExpired(token)) {
                        console.log('Token expiré détecté lors de l\'initialisation');
                        authService.removeToken();
                        dispatch({ type: 'LOGOUT' });
                        return;
                    }
                    
                    try {
                        // Vérifier si le token est valide côté serveur
                        const user = await authService.getCurrentUser();
                        
                        dispatch({
                            type: 'LOGIN_SUCCESS',
                            payload: { user, token }
                        });

                        // Configurer le refresh automatique
                        setupTokenRefresh(token);
                    } catch (error) {
                        console.error('Token invalide côté serveur:', error);
                        // Ne pas supprimer le token ici, car l'événement auth:unauthorized le fera
                        // Cela évite le double logout
                        dispatch({ type: 'LOGOUT' });
                    }
                } else {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            } catch (error) {
                console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
                // Nettoyer les données corrompues
                authService.removeToken();
                dispatch({ type: 'LOGOUT' });
            }
        };

        initializeAuth();

        // Nettoyage au démontage
        return () => {
            if (state.refreshTokenTimeout) {
                clearTimeout(state.refreshTokenTimeout);
            }
        };
    }, []);

    // Intercepteur pour gérer les erreurs 401
    useEffect(() => {
        const handleUnauthorized = () => {
            // Éviter les appels multiples si l'utilisateur n'est plus authentifié
            if (state.isAuthenticated) {
                console.log('Session expirée détectée, déconnexion automatique');
                dispatch({ type: 'SET_ERROR', payload: 'Session expirée' });
                logout();
            }
        };

        // Écouter les événements d'erreur d'authentification
        window.addEventListener('auth:unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, [state.isAuthenticated, logout]);

    const value = {
        // État
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        login,
        logout,
        refreshToken,
        getCurrentUser,
        updateUser,
        hasRole,
        hasAnyRole,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth doit être utilisé dans un AuthProvider');
    }
    
    return context;
};

export default AuthContext;