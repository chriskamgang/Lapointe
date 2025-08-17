/**
 * Système de limitation de débit côté client
 * Évite les erreurs HTTP 429 en limitant le nombre de requêtes par seconde
 */

class RateLimiter {
    constructor(maxRequests = 10, timeWindow = 1000) {
        this.maxRequests = maxRequests; // Nombre max de requêtes
        this.timeWindow = timeWindow;   // Fenêtre de temps en ms
        this.requests = [];             // Historique des requêtes
        this.queue = [];               // File d'attente des requêtes
        this.processing = false;       // Flag de traitement
    }

    /**
     * Ajoute une requête à la file d'attente
     */
    async execute(requestFunction) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                request: requestFunction,
                resolve,
                reject
            });

            this.processQueue();
        });
    }

    /**
     * Traite la file d'attente des requêtes
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            // Nettoyer les anciennes requêtes
            const now = Date.now();
            this.requests = this.requests.filter(
                timestamp => now - timestamp < this.timeWindow
            );

            // Vérifier si on peut faire une nouvelle requête
            if (this.requests.length >= this.maxRequests) {
                // Attendre jusqu'à ce qu'une requête sorte de la fenêtre
                const oldestRequest = Math.min(...this.requests);
                const waitTime = this.timeWindow - (now - oldestRequest);
                
                if (waitTime > 0) {
                    console.log(`Rate limiter: waiting ${waitTime}ms before next request`);
                    await this.delay(waitTime);
                    continue;
                }
            }

            // Exécuter la prochaine requête
            const { request, resolve, reject } = this.queue.shift();
            this.requests.push(Date.now());

            try {
                const result = await request();
                resolve(result);
            } catch (error) {
                reject(error);
            }

            // Petit délai entre les requêtes pour éviter de surcharger
            await this.delay(50);
        }

        this.processing = false;
    }

    /**
     * Utilitaire pour créer un délai
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Réinitialise le limiteur
     */
    reset() {
        this.requests = [];
        this.queue = [];
        this.processing = false;
    }

    /**
     * Obtient les statistiques actuelles
     */
    getStats() {
        const now = Date.now();
        const recentRequests = this.requests.filter(
            timestamp => now - timestamp < this.timeWindow
        ).length;

        return {
            queueLength: this.queue.length,
            recentRequests,
            maxRequests: this.maxRequests,
            canMakeRequest: recentRequests < this.maxRequests
        };
    }
}

// Instance globale du limiteur de débit
// Limite à 5 requêtes par seconde pour être conservateur
const globalRateLimiter = new RateLimiter(5, 1000);

/**
 * Fonction wrapper pour appliquer la limitation de débit à une requête
 */
export const withRateLimit = async (requestFunction) => {
    return globalRateLimiter.execute(requestFunction);
};

/**
 * Hook React pour surveiller l'état du rate limiter
 */
// export const useRateLimiterStats = () => {
//     // Import dynamique pour éviter les dépendances circulaires
//     if (typeof window !== 'undefined' && window.React) {
//         // const { useState, useEffect } = window.React;
//         const [stats, setStats] = useState(globalRateLimiter.getStats());

//         useEffect(() => {
//             const interval = setInterval(() => {
//                 setStats(globalRateLimiter.getStats());
//             }, 100);

//             return () => clearInterval(interval);
//         }, []);

//         return stats;
//     }
    
//     return globalRateLimiter.getStats();
// };

export default globalRateLimiter;