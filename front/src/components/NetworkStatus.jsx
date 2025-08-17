import { useState, useEffect } from 'react';
import { Alert } from './UI';

/**
 * Composant pour afficher le statut de la connexion réseau
 */
const NetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showOfflineAlert, setShowOfflineAlert] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowOfflineAlert(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOfflineAlert(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Afficher l'alerte si déjà hors ligne
        if (!navigator.onLine) {
            setShowOfflineAlert(true);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showOfflineAlert) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            <Alert
                variant="warning"
                className="rounded-none border-x-0 border-t-0"
                dismissible={false}
            >
                <div className="flex items-center justify-center">
                    <svg 
                        className="w-5 h-5 mr-2" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                        />
                    </svg>
                    <span className="font-medium">
                        Connexion internet indisponible. Certaines fonctionnalités peuvent ne pas fonctionner.
                    </span>
                </div>
            </Alert>
        </div>
    );
};

/**
 * Hook pour surveiller le statut de la connexion
 */
export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};

/**
 * Composant pour afficher l'état de la limitation de débit
 */
export const RateLimitIndicator = ({ stats }) => {
    if (!stats || stats.queueLength === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded shadow-lg">
                <div className="flex items-center">
                    <svg 
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                    >
                        <circle 
                            className="opacity-25" 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke="currentColor" 
                            strokeWidth="4"
                        />
                        <path 
                            className="opacity-75" 
                            fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span className="text-sm">
                        {stats.queueLength} requête{stats.queueLength > 1 ? 's' : ''} en attente
                    </span>
                </div>
            </div>
        </div>
    );
};

export default NetworkStatus;