import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Search, 
    Bell, 
    List,
    Globe,
    ChevronRight,
    Gear,
    PersonCircle,
    ChatDots
} from 'react-bootstrap-icons';
import { useAuth, usePermissions } from '../hooks/useAuth';
import UserMenu from './UserMenu';
const TopBar = ({ onSidebarToggle, showSidebarToggle = false }) => {
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Hooks d'authentification
    const { user, isAuthenticated } = useAuth();
    const { canManageUsers, canAccess } = usePermissions();
    const getBreadcrumb = () => {
        const path = location.pathname;
        const segments = path.split('/').filter(segment => segment);
        
        const breadcrumbMap = {
            '': 'Accueil',
            'class': 'Classes',
            'teachers': 'Enseignants',
            'students': 'Élèves',
            'matieres': 'Matières',
            'search': 'Recherche',
            'params': 'Profil',
            'profile': 'Profil',
            'settings': 'Paramètres',
            'docs': 'Documents',
            'stats': 'Statistiques',
            'seqs': 'Séquences',
            'trims': 'Trimestres',
            'competences': 'Compétences',
            'login': 'Connexion',
            'register': 'Inscription'
        };

        if (segments.length === 0) {
            return [{ name: 'Accueil', path: '/' }];
        }

        const breadcrumbs = [{ name: 'Accueil', path: '/' }];
        
        segments.forEach((segment, index) => {
            const path = '/' + segments.slice(0, index + 1).join('/');
            const name = breadcrumbMap[segment] || segment;
            breadcrumbs.push({ name, path });
        });

        return breadcrumbs;
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
        }
    };
    const breadcrumbs = getBreadcrumb();

    return (
        <div className="topbar">
            <div className="topbar-left">
                {showSidebarToggle && (
                    <button 
                        className="sidebar-toggle"
                        onClick={onSidebarToggle}
                        aria-label="Toggle sidebar"
                    >
                        <List size={20} />
                    </button>
                )}
                
                <nav className="breadcrumb">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && (
                                <ChevronRight className="breadcrumb-separator" size={14} />
                            )}
                            <span className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}>
                                {index === breadcrumbs.length - 1 ? (
                                    crumb.name
                                ) : (
                                    <Link to={crumb.path}>{crumb.name}</Link>
                                )}
                            </span>
                        </React.Fragment>
                    ))}
                </nav>
            </div>

            <div className="topbar-right">
                {isAuthenticated && user && (
                    <>
                        {/* Search Box */}
                        <div className="search-box">
                            <Search className="search-icon" size={16} />
                            <form onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Rechercher élèves, enseignants..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>

                        <div className="topbar-actions">
                            {/* Language Selector */}
                            <button className="action-btn" title="Langue">
                                <Globe size={18} />
                            </button>

                            {/* Notifications */}
                            <div className="relative">
                                <button 
                                    className="action-btn has-notification" 
                                    title="Notifications"
                                    onClick={() => setShowNotifications(!showNotifications)}
                                >
                                    <Bell size={18} />
                                </button>
                                {showNotifications && (
                                    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                                        <div className="p-4 border-b border-gray-200">
                                            <h3 className="font-semibold text-gray-800">Notifications</h3>
                                        </div>
                                        <div className="p-4 text-center text-gray-500">
                                            Aucune nouvelle notification
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Messages */}
                            <button className="action-btn" title="Messages">
                                <ChatDots size={18} />
                            </button>

                            {/* Settings - seulement pour les admins */}
                            {canManageUsers() && (
                                <Link to="/settings" className="action-btn" title="Paramètres">
                                    <Gear size={18} />
                                </Link>
                            )}

                            {/* User Profile */}
                            <Link to="/profile" className="action-btn" title="Profil">
                                <PersonCircle size={18} />
                            </Link>

                            {/* Menu utilisateur avec déconnexion */}
                            <UserMenu className="ml-2" />
                        </div>
                    </>
                )}

                {!isAuthenticated && (
                    <div className="flex gap-2">
                        <Link to="/login" className="btn btn-secondary">
                            Connexion
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopBar;