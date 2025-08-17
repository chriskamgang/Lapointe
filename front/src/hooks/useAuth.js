import { useState, useEffect, useCallback } from 'react';
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { tokenManager } from '../utils/tokenManager';

/**
 * Hook principal pour l'authentification
 * Expose toutes les fonctionnalités du contexte d'authentification
 */
export const useAuth = () => {
    return useAuthContext();
};

/**
 * Hook pour la gestion du login avec état local
 */
export const useLogin = () => {
    const { login, isLoading, error, clearError } = useAuth();
    const [loginState, setLoginState] = useState({
        isSubmitting: false,
        error: null,
        success: false
    });

    const handleLogin = useCallback(async (credentials, options = {}) => {
        setLoginState({ isSubmitting: true, error: null, success: false });
        clearError();

        try {
            const result = await login(credentials);
            setLoginState({ isSubmitting: false, error: null, success: true });
            
            // Callback de succès optionnel
            if (options.onSuccess) {
                options.onSuccess(result);
            }
            
            return result;
        } catch (error) {
            const errorMessage = error.message || 'Erreur de connexion';
            setLoginState({ isSubmitting: false, error: errorMessage, success: false });
            
            // Callback d'erreur optionnel
            if (options.onError) {
                options.onError(error);
            }
            
            throw error;
        }
    }, [login, clearError]);

    const resetLoginState = useCallback(() => {
        setLoginState({ isSubmitting: false, error: null, success: false });
        clearError();
    }, [clearError]);

    return {
        handleLogin,
        resetLoginState,
        isSubmitting: loginState.isSubmitting || isLoading,
        error: loginState.error || error,
        success: loginState.success
    };
};

/**
 * Hook pour les permissions et rôles
 */
export const usePermissions = () => {
    const { user, hasRole, hasAnyRole } = useAuth();

    const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
    const isTeacher = useCallback(() => hasRole('teacher'), [hasRole]);
    const isAccountant = useCallback(() => hasRole('accountant') || hasRole('comptable_superieur'), [hasRole]);
    const isUser = useCallback(() => hasRole('user'), [hasRole]);

    const canAccess = useCallback((requiredRoles) => {
        if (!requiredRoles || requiredRoles.length === 0) return true;
        return hasAnyRole(requiredRoles);
    }, [hasAnyRole]);

    const canManageUsers = useCallback(() => {
        return hasAnyRole(['admin']);
    }, [hasAnyRole]);

    const canManageStudents = useCallback(() => {
        return hasAnyRole(['admin', 'teacher']);
    }, [hasAnyRole]);

    const canManageFinances = useCallback(() => {
        return hasAnyRole(['admin', 'accountant', 'comptable_superieur']);
    }, [hasAnyRole]);

    const canViewReports = useCallback(() => {
        return hasAnyRole(['admin', 'teacher', 'accountant', 'comptable_superieur']);
    }, [hasAnyRole]);

    const canManageNeeds = useCallback(() => {
        return hasAnyRole(['admin', 'comptable_superieur']);
    }, [hasAnyRole]);

    const canManageInventory = useCallback(() => {
        return hasAnyRole(['admin', 'accountant', 'comptable_superieur']);
    }, [hasAnyRole]);

    return {
        user,
        userRole: user?.role,
        isAdmin,
        isTeacher,
        isAccountant,
        isUser,
        canAccess,
        canManageUsers,
        canManageStudents,
        canManageFinances,
        canViewReports,
        canManageNeeds,
        canManageInventory
    };
};

/**
 * Hook pour surveiller l'état du token
 */
export const useTokenStatus = () => {
    const { token } = useAuth();
    const [tokenInfo, setTokenInfo] = useState(null);

    useEffect(() => {
        if (!token) {
            setTokenInfo(null);
            return;
        }

        const updateTokenInfo = () => {
            const info = tokenManager.getTokenInfo(token);
            setTokenInfo(info);
        };

        updateTokenInfo();

        // Mettre à jour toutes les 30 secondes
        const interval = setInterval(updateTokenInfo, 30000);

        return () => clearInterval(interval);
    }, [token]);

    return {
        tokenInfo,
        isTokenExpired: tokenInfo?.isExpired || false,
        timeUntilExpiry: tokenInfo?.timeUntilExpiry || 0,
        isTokenValid: tokenInfo?.isValid || false
    };
};

/**
 * Hook pour la déconnexion avec nettoyage
 */
export const useLogout = () => {
    const { logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = useCallback(async (options = {}) => {
        setIsLoggingOut(true);

        try {
            await logout();
            
            // Nettoyage supplémentaire si nécessaire
            if (options.clearCache) {
                // Nettoyer le cache local, cookies, etc.
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                }
            }

            // Callback de succès optionnel
            if (options.onSuccess) {
                options.onSuccess();
            }
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            
            // Callback d'erreur optionnel
            if (options.onError) {
                options.onError(error);
            }
        } finally {
            setIsLoggingOut(false);
        }
    }, [logout]);

    return {
        handleLogout,
        isLoggingOut
    };
};

/**
 * Hook pour la redirection basée sur l'authentification
 */
export const useAuthRedirect = (redirectPath = '/login', dependencies = []) => {
    const { isAuthenticated, isLoading } = useAuth();
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            setShouldRedirect(true);
        } else {
            setShouldRedirect(false);
        }
    }, [isAuthenticated, isLoading, ...dependencies]);

    return {
        shouldRedirect,
        redirectPath,
        isReady: !isLoading
    };
};

/**
 * Hook pour les notifications d'authentification
 */
export const useAuthNotifications = () => {
    const { error, clearError } = useAuth();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (error) {
            const notification = {
                id: Date.now(),
                type: 'error',
                title: 'Erreur d\'authentification',
                message: error,
                timestamp: new Date()
            };

            setNotifications(prev => [notification, ...prev].slice(0, 5)); // Garder max 5 notifications
        }
    }, [error]);

    const dismissNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
        clearError();
    }, [clearError]);

    return {
        notifications,
        dismissNotification,
        clearAllNotifications,
        hasNotifications: notifications.length > 0
    };
};

/**
 * Hook pour persister l'état d'authentification
 */
export const useAuthPersistence = () => {
    const { isAuthenticated, user } = useAuth();
    const [preference, setPreference] = useState(() => {
        try {
            return localStorage.getItem('auth_persistence_preference') === 'true';
        } catch {
            return false;
        }
    });

    const updatePersistencePreference = useCallback((persist) => {
        setPreference(persist);
        try {
            localStorage.setItem('auth_persistence_preference', persist.toString());
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la préférence:', error);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            // Sauvegarder l'état selon la préférence
            const storage = preference ? localStorage : sessionStorage;
            try {
                storage.setItem('last_auth_state', JSON.stringify({
                    timestamp: Date.now(),
                    userId: user.id,
                    username: user.username
                }));
            } catch (error) {
                console.error('Erreur lors de la sauvegarde de l\'état:', error);
            }
        }
    }, [isAuthenticated, user, preference]);

    return {
        persistenceEnabled: preference,
        updatePersistencePreference
    };
};

/**
 * Hook pour l'authentification automatique (auto-login)
 */
export const useAutoAuth = () => {
    const { getCurrentUser, isLoading } = useAuth();
    const [autoAuthAttempted, setAutoAuthAttempted] = useState(false);

    useEffect(() => {
        const attemptAutoAuth = async () => {
            if (autoAuthAttempted || isLoading) return;

            const token = tokenManager.getToken();
            if (token && !tokenManager.isTokenExpired(token)) {
                try {
                    await getCurrentUser();
                } catch (error) {
                    console.error('Échec de l\'authentification automatique:', error);
                    tokenManager.removeToken();
                }
            }
            
            setAutoAuthAttempted(true);
        };

        attemptAutoAuth();
    }, [getCurrentUser, isLoading, autoAuthAttempted]);

    return {
        autoAuthCompleted: autoAuthAttempted,
        isInitializing: !autoAuthAttempted && isLoading
    };
};