import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { useAutoAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './UI';

/**
 * Composant wrapper pour initialiser l'authentification
 */
const AuthInitializer = ({ children }) => {
    const { autoAuthCompleted, isInitializing } = useAutoAuth();

    if (isInitializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-violet-50 via-white to-primary-violet-100">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary-violet to-primary-violet-dark shadow-lg mb-6">
                        <LoadingSpinner size="lg" className="text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        Initialisation...
                    </h2>
                    <p className="text-gray-600">
                        Vérification de l'authentification
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

/**
 * Composant principal pour wrapper l'application avec l'authentification
 */
const AppAuthProvider = ({ children }) => {
    return (
        <AuthProvider>
            <AuthInitializer>
                {children}
            </AuthInitializer>
        </AuthProvider>
    );
};

export default AppAuthProvider;