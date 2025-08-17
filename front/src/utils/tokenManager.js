import React from 'react';

/**
 * Gestionnaire sécurisé des tokens JWT
 * Fournit des fonctionnalités avancées pour la gestion des tokens
 */

class TokenManager {
    constructor() {
        this.tokenKey = 'auth_token';
        this.refreshTokenKey = 'refresh_token';
        this.tokenPrefix = 'Bearer ';
    }

    /**
     * Décode un token JWT sans vérification (côté client uniquement pour l'UI)
     * ATTENTION: Ne jamais faire confiance au contenu côté client pour la sécurité
     */
    decodeToken(token) {
        try {
            if (!token) return null;
            
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch (error) {
            console.error('Erreur lors du décodage du token:', error);
            return null;
        }
    }

    /**
     * Vérifie si un token est expiré
     */
    isTokenExpired(token, bufferSeconds = 60) {
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) return true;
        
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = payload.exp - bufferSeconds; // Buffer de sécurité
        
        return currentTime >= expirationTime;
    }

    /**
     * Obtient le temps restant avant expiration en secondes
     */
    getTimeUntilExpiry(token) {
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) return 0;
        
        const currentTime = Math.floor(Date.now() / 1000);
        return Math.max(0, payload.exp - currentTime);
    }

    /**
     * Obtient les informations utilisateur du token
     */
    getUserFromToken(token) {
        const payload = this.decodeToken(token);
        if (!payload) return null;
        
        return {
            id: payload.sub || payload.user_id || payload.id,
            username: payload.username || payload.preferred_username,
            email: payload.email,
            role: payload.role || payload.roles,
            permissions: payload.permissions || [],
            exp: payload.exp,
            iat: payload.iat
        };
    }

    /**
     * Stockage sécurisé du token
     */
    setToken(token, remember = false) {
        try {
            if (!token) return false;
            
            // Valider le format du token
            if (!this.isValidTokenFormat(token)) {
                throw new Error('Format de token invalide');
            }
            
            const storage = remember ? localStorage : sessionStorage;
            storage.setItem(this.tokenKey, token);
            
            // Marquer le type de stockage pour le retrieval
            storage.setItem(`${this.tokenKey}_persistent`, remember.toString());
            
            return true;
        } catch (error) {
            console.error('Erreur lors du stockage du token:', error);
            return false;
        }
    }

    /**
     * Récupération sécurisée du token
     */
    getToken() {
        try {
            // Essayer d'abord localStorage puis sessionStorage
            let token = localStorage.getItem(this.tokenKey);
            let isPersistent = localStorage.getItem(`${this.tokenKey}_persistent`) === 'true';
            
            if (!token) {
                token = sessionStorage.getItem(this.tokenKey);
                isPersistent = false;
            }
            
            if (!token) return null;
            
            // Vérifier si le token est expiré
            if (this.isTokenExpired(token)) {
                this.removeToken();
                return null;
            }
            
            return token;
        } catch (error) {
            console.error('Erreur lors de la récupération du token:', error);
            return null;
        }
    }

    /**
     * Suppression sécurisée du token
     */
    removeToken() {
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(`${this.tokenKey}_persistent`);
            localStorage.removeItem(this.refreshTokenKey);
            
            sessionStorage.removeItem(this.tokenKey);
            sessionStorage.removeItem(`${this.tokenKey}_persistent`);
            sessionStorage.removeItem(this.refreshTokenKey);
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du token:', error);
            return false;
        }
    }

    /**
     * Validation du format du token JWT
     */
    isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') return false;
        
        // Un JWT doit avoir 3 parties séparées par des points
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        // Vérifier que chaque partie est en base64
        try {
            parts.forEach(part => {
                atob(part);
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtient le header d'autorisation formaté
     */
    getAuthHeader() {
        const token = this.getToken();
        return token ? `${this.tokenPrefix}${token}` : null;
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     */
    isAuthenticated() {
        const token = this.getToken();
        return token && !this.isTokenExpired(token);
    }

    /**
     * Planifie le refresh automatique du token
     */
    scheduleTokenRefresh(token, refreshCallback, bufferMinutes = 5) {
        if (!token || !refreshCallback) return null;
        
        const timeUntilExpiry = this.getTimeUntilExpiry(token);
        const refreshTime = Math.max(0, (timeUntilExpiry - (bufferMinutes * 60)) * 1000);
        
        if (refreshTime <= 0) {
            // Token déjà expiré ou sur le point d'expirer
            refreshCallback();
            return null;
        }
        
        const timeoutId = setTimeout(() => {
            refreshCallback();
        }, refreshTime);
        
        console.log(`Token refresh planifié dans ${Math.floor(refreshTime / 1000)} secondes`);
        return timeoutId;
    }

    /**
     * Nettoie les timeouts de refresh
     */
    clearTokenRefresh(timeoutId) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Gestion du refresh token (si supporté par le backend)
     */
    setRefreshToken(refreshToken) {
        try {
            if (refreshToken) {
                localStorage.setItem(this.refreshTokenKey, refreshToken);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur lors du stockage du refresh token:', error);
            return false;
        }
    }

    getRefreshToken() {
        try {
            return localStorage.getItem(this.refreshTokenKey);
        } catch (error) {
            console.error('Erreur lors de la récupération du refresh token:', error);
            return null;
        }
    }

    /**
     * Validation de sécurité côté client (ne pas faire confiance pour la sécurité réelle)
     */
    validateTokenStructure(token) {
        const payload = this.decodeToken(token);
        if (!payload) return false;
        
        // Vérifications basiques
        const requiredFields = ['exp', 'iat'];
        const hasRequiredFields = requiredFields.every(field => 
            payload.hasOwnProperty(field) && payload[field]
        );
        
        if (!hasRequiredFields) return false;
        
        // Vérifier que iat (issued at) n'est pas dans le futur
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.iat > currentTime + 60) return false; // Buffer de 60 secondes
        
        // Vérifier que exp (expiration) est après iat
        if (payload.exp <= payload.iat) return false;
        
        return true;
    }

    /**
     * Obtient des informations de débogage sur le token
     */
    getTokenInfo(token = null) {
        const currentToken = token || this.getToken();
        if (!currentToken) return null;
        
        const payload = this.decodeToken(currentToken);
        if (!payload) return null;
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        return {
            isValid: this.validateTokenStructure(currentToken),
            isExpired: this.isTokenExpired(currentToken),
            timeUntilExpiry: this.getTimeUntilExpiry(currentToken),
            issuedAt: new Date(payload.iat * 1000).toISOString(),
            expiresAt: new Date(payload.exp * 1000).toISOString(),
            user: this.getUserFromToken(currentToken),
            rawPayload: payload
        };
    }
}

// Instance singleton
export const tokenManager = new TokenManager();

// Hooks et utilitaires pour React
export const useTokenInfo = () => {
    const [tokenInfo, setTokenInfo] = React.useState(null);
    
    React.useEffect(() => {
        const updateTokenInfo = () => {
            setTokenInfo(tokenManager.getTokenInfo());
        };
        
        updateTokenInfo();
        
        // Mettre à jour toutes les minutes
        const interval = setInterval(updateTokenInfo, 60000);
        
        return () => clearInterval(interval);
    }, []);
    
    return tokenInfo;
};

export default tokenManager;