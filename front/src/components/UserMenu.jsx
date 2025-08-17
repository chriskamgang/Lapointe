import React, { useState, useRef, useEffect } from 'react';
import { 
    PersonFill, 
    GearFill, 
    BoxArrowRight,
    ChevronDown,
    ShieldFill
} from 'react-bootstrap-icons';
import { useAuth, useLogout, useTokenStatus } from '../hooks/useAuth';
import { Button, LoadingSpinner } from './UI';

/**
 * Menu utilisateur avec informations et déconnexion
 */
const UserMenu = ({ className = '' }) => {
    const { user, isAuthenticated } = useAuth();
    const { handleLogout, isLoggingOut } = useLogout();
    const { tokenInfo, timeUntilExpiry } = useTokenStatus();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Fermer le menu quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Formatage du temps restant
    const formatTimeRemaining = (seconds) => {
        if (seconds <= 0) return 'Expiré';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    // Gestion de la déconnexion
    const onLogout = async () => {
        setIsOpen(false);
        await handleLogout({
            clearCache: true,
            onSuccess: () => {
                // Optionnel: afficher une notification de succès
                console.log('Déconnexion réussie');
            }
        });
    };

    if (!isAuthenticated || !user) {
        return null;
    }

    const getRoleColor = (role) => {
        const roleColors = {
            admin: 'bg-red-100 text-red-800',
            teacher: 'bg-blue-100 text-blue-800',
            accountant: 'bg-green-100 text-green-800',
            user: 'bg-gray-100 text-gray-800'
        };
        return roleColors[role] || roleColors.user;
    };

    const getRoleLabel = (role) => {
        const roleLabels = {
            admin: 'Administrateur',
            teacher: 'Enseignant',
            accountant: 'Comptable',
            user: 'Utilisateur'
        };
        return roleLabels[role] || role;
    };

    return (
        <div className={`relative ${className}`} ref={menuRef}>
            {/* Bouton utilisateur */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-violet focus:ring-offset-2"
                disabled={isLoggingOut}
            >
                {/* Avatar */}
                <div className="w-8 h-8 bg-primary-violet rounded-full flex items-center justify-center">
                    <PersonFill className="text-white" size={14} />
                </div>
                
                {/* Informations utilisateur */}
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                        {user.name || user.username}
                    </div>
                    <div className="text-xs text-gray-500">
                        {getRoleLabel(user.role)}
                    </div>
                </div>
                
                {/* Indicateur d'ouverture */}
                <ChevronDown 
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    size={16}
                />
                
                {/* Loader pendant la déconnexion */}
                {isLoggingOut && (
                    <LoadingSpinner size="sm" className="text-primary-violet" />
                )}
            </button>

            {/* Menu déroulant */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* En-tête du menu */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary-violet rounded-full flex items-center justify-center">
                                <PersonFill className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                    {user.name || user.username}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {user.email}
                                </div>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                        <ShieldFill size={12} className="mr-1" />
                                        {getRoleLabel(user.role)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Informations de session */}
                    {tokenInfo && (
                        <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <span>Session expire dans:</span>
                                <span className={`font-medium ${timeUntilExpiry < 600 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatTimeRemaining(timeUntilExpiry)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Options du menu */}
                    <div className="py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // Naviguer vers le profil
                                console.log('Ouvrir le profil');
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <PersonFill size={16} className="mr-3 text-gray-400" />
                            Mon profil
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // Naviguer vers les paramètres
                                console.log('Ouvrir les paramètres');
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <GearFill size={16} className="mr-3 text-gray-400" />
                            Paramètres
                        </button>
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Bouton de déconnexion */}
                    <div className="px-4 py-2">
                        <Button
                            onClick={onLogout}
                            variant="outline"
                            size="sm"
                            fullWidth
                            disabled={isLoggingOut}
                            loading={isLoggingOut}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        >
                            <BoxArrowRight size={16} className="mr-2" />
                            {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Version compacte du menu utilisateur
 */
export const CompactUserMenu = ({ className = '' }) => {
    const { user } = useAuth();
    const { handleLogout, isLoggingOut } = useLogout();

    if (!user) return null;

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <span className="text-sm text-gray-600">
                {user.username}
            </span>
            <Button
                onClick={() => handleLogout({ clearCache: true })}
                variant="ghost"
                size="sm"
                disabled={isLoggingOut}
                loading={isLoggingOut}
            >
                <BoxArrowRight size={16} />
            </Button>
        </div>
    );
};

export default UserMenu;