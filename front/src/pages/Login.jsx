import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    PersonFill, 
    LockFill, 
    EyeFill, 
    EyeSlashFill,
    // ShieldLockFill
} from 'react-bootstrap-icons';
import logo from '../images/logo.png'

// Components
import { Card, Button, Input, Alert, LoadingSpinner } from '../components/UI';

// Utils
import { authTraductions } from '../local/login';
import { getLang } from '../utils/lang';

// Auth hooks
import { useLogin, useAuth, useAuthPersistence } from '../hooks/useAuth';

const Login = () => {
    const [data, setData] = useState({
        username: '',
        password: '',
        remember: false
    });
    const [showPassword, setShowPassword] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Hooks d'authentification
    const { isAuthenticated, user } = useAuth();
    const { handleLogin, isSubmitting, error, success, resetLoginState } = useLogin();
    const { persistenceEnabled, updatePersistencePreference } = useAuthPersistence();

    // Redirection si déjà authentifié
    useEffect(() => {
        if (isAuthenticated && user) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, user, navigate, location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!data.username.trim() || !data.password) {
            return;
        }

        try {
            // Utiliser le hook de login
            const result = await handleLogin(data, {
                onSuccess: (response) => {
                    // Mettre à jour la préférence de persistance
                    updatePersistencePreference(data.remember);
                    
                    // Redirection basée sur le rôle
                    const from = location.state?.from?.pathname || getDefaultRoute(response.user.role);
                    navigate(from, { replace: true });
                }
            });
        } catch (error) {
            // L'erreur est déjà gérée par le hook useLogin
            console.error('Erreur de connexion:', error);
        }
    };

    // Fonction pour déterminer la route par défaut selon le rôle
    const getDefaultRoute = (role) => {
        switch (role) {
            case 'admin':
                return '/';
            case 'accountant':
                return '/class-comp';
            case 'teacher':
                return '/students';
            default:
                return '/';
        }
    };

    const handleInputChange = (field, value) => {
        setData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (error) {
            resetLoginState();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-violet-50 via-white to-primary-violet-100 p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-violet-100 opacity-50"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary-violet-50 opacity-50"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo and Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary-violet to-primary-violet-dark shadow-lg mb-4">
                        {/* <ShieldLockFill className="text-white" size={24} /> */}
                        <img 
                            src={logo} 
                            style={{objectFit: "cover", width: "70%", height: "70%"}}
                            alt="GSBPL Logo" 
                            className="w-12 h-12 rounded-full"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        CPBD
                    </h1>
                    <p className="text-gray-600">
                        Système de Gestion de Collège
                    </p>
                </div>

                {/* Login Card */}
                <Card className="shadow-xl border-0 backdrop-blur-sm bg-white/95">
                    <Card.Content className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                                {authTraductions[getLang()].login}
                            </h2>
                            <p className="text-gray-600">
                                Connectez-vous à votre compte
                            </p>
                        </div>

                        {error && (
                            <Alert 
                                variant="error" 
                                className="mb-6"
                                dismissible
                                onDismiss={() => resetLoginState()}
                            >
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert 
                                variant="success" 
                                className="mb-6"
                            >
                                Connexion réussie ! Redirection en cours...
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                label={authTraductions[getLang()].emailOrPseudo}
                                type="text"
                                value={data.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                placeholder="Entrez votre nom d'utilisateur"
                                icon={<PersonFill size={18} />}
                                iconPosition="left"
                                required
                                disabled={isSubmitting}
                            />

                            <Input
                                label={authTraductions[getLang()].password}
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="Entrez votre mot de passe"
                                icon={<LockFill size={18} />}
                                iconPosition="left"
                                required
                                disabled={isSubmitting}
                                containerClassName="relative"
                            >
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isSubmitting}
                                >
                                    {showPassword ? (
                                        <EyeSlashFill size={18} />
                                    ) : (
                                        <EyeFill size={18} />
                                    )}
                                </button>
                            </Input>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(e) => handleInputChange('remember', e.target.checked)}
                                        className="w-4 h-4 text-primary-violet border-gray-300 rounded focus:ring-primary-violet focus:ring-2"
                                        disabled={isSubmitting}
                                    />
                                    <span className="ml-2 text-sm text-gray-600">
                                        Se souvenir de moi
                                    </span>
                                </label>
                                
                                <button
                                    type="button"
                                    className="text-sm text-primary-violet hover:text-primary-violet-dark transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Mot de passe oublié?
                                </button>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                size="lg"
                                disabled={isSubmitting || !data.username.trim() || !data.password}
                                loading={isSubmitting}
                            >
                                {isSubmitting 
                                    ? authTraductions[getLang()].logining 
                                    : authTraductions[getLang()].login
                                }
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Problème de connexion?{' '}
                                <button 
                                    className="text-primary-violet hover:text-primary-violet-dark font-medium transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Contacter l'administrateur
                                </button>
                            </p>
                        </div>
                    </Card.Content>
                </Card>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-sm text-gray-500">
                        ©2025 Collège Polyvalent Bilingue de Douala. Tous droits réservés.
                    </p>
                </div>
            </div>

            {/* Loading Overlay */}
            {isSubmitting && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 shadow-xl">
                        <LoadingSpinner text="Connexion en cours..." />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;