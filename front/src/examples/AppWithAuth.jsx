import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Providers d'authentification
import AppAuthProvider from '../components/AuthProvider';
import ProtectedRoute, { 
    AdminRoute, 
    TeacherRoute, 
    AccountantRoute, 
    PublicRoute,
    RoleBasedRedirect 
} from '../components/ProtectedRoute';

// Components
import UserMenu from '../components/UserMenu';
import Login from '../pages/Login';

// Pages d'exemple (remplacez par vos vraies pages)
import Dashboard from '../pages/Dashboard';
import Students from '../pages/Students';
import Teachers from '../pages/Teachers';
import UserProfile from '../pages/Profile/UserProfile';

/**
 * Exemple d'intégration complète de l'authentification dans votre App
 * 
 * Pour utiliser ce système dans votre App.js existant:
 * 
 * 1. Wrappez votre application avec AppAuthProvider
 * 2. Utilisez les composants de protection des routes
 * 3. Intégrez UserMenu dans votre layout
 * 4. Mettez à jour vos imports d'api pour utiliser le nouveau système
 */

const AppWithAuth = () => {
    return (
        <AppAuthProvider>
            <Router>
                <div className="min-h-screen bg-gray-50">
                    {/* Header avec menu utilisateur */}
                    <header className="bg-white shadow-sm border-b">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16">
                                <div className="flex items-center">
                                    <h1 className="text-xl font-semibold text-gray-900">
                                        Système de Gestion Scolaire
                                    </h1>
                                </div>
                                
                                {/* Menu utilisateur */}
                                <UserMenu />
                            </div>
                        </div>
                    </header>

                    {/* Routes principales */}
                    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                        <Routes>
                            {/* Route publique (login) */}
                            <Route 
                                path="/login" 
                                element={
                                    <PublicRoute>
                                        <Login />
                                    </PublicRoute>
                                } 
                            />

                            {/* Route de redirection basée sur le rôle */}
                            <Route 
                                path="/" 
                                element={
                                    <RoleBasedRedirect>
                                        <Dashboard />
                                    </RoleBasedRedirect>
                                } 
                            />

                            {/* Routes protégées générales */}
                            <Route 
                                path="/dashboard" 
                                element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                } 
                            />

                            <Route 
                                path="/profile" 
                                element={
                                    <ProtectedRoute>
                                        <UserProfile />
                                    </ProtectedRoute>
                                } 
                            />

                            {/* Routes pour enseignants et admins */}
                            <Route 
                                path="/students" 
                                element={
                                    <TeacherRoute>
                                        <Students />
                                    </TeacherRoute>
                                } 
                            />

                            <Route 
                                path="/students/:classId" 
                                element={
                                    <TeacherRoute>
                                        <Students />
                                    </TeacherRoute>
                                } 
                            />

                            {/* Routes pour admins uniquement */}
                            <Route 
                                path="/teachers" 
                                element={
                                    <AdminRoute>
                                        <Teachers />
                                    </AdminRoute>
                                } 
                            />

                            <Route 
                                path="/settings" 
                                element={
                                    <AdminRoute>
                                        <div>Paramètres système</div>
                                    </AdminRoute>
                                } 
                            />

                            {/* Routes pour comptables et admins */}
                            <Route 
                                path="/class-comp" 
                                element={
                                    <AccountantRoute>
                                        <div>Gestion comptable</div>
                                    </AccountantRoute>
                                } 
                            />

                            {/* Route 404 */}
                            <Route 
                                path="*" 
                                element={
                                    <ProtectedRoute>
                                        <div className="text-center py-12">
                                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                                Page non trouvée
                                            </h2>
                                            <p className="text-gray-600">
                                                La page que vous cherchez n'existe pas.
                                            </p>
                                        </div>
                                    </ProtectedRoute>
                                } 
                            />
                        </Routes>
                    </main>
                </div>
            </Router>
        </AppAuthProvider>
    );
};

export default AppWithAuth;

/**
 * GUIDE D'INTÉGRATION DANS VOTRE APP.JS EXISTANT:
 * 
 * 1. Remplacez vos imports existants:
 * ```javascript
 * // Ancien
 * import { apiEndpoints } from './utils/api';
 * 
 * // Nouveau 
 * import { useAuth, useLogin } from './hooks/useAuth';
 * import { authService } from './services/authService';
 * ```
 * 
 * 2. Wrappez votre App avec le provider:
 * ```javascript
 * function App() {
 *   return (
 *     <AppAuthProvider>
 *       {/* Votre app existante */}
 *     </AppAuthProvider>
 *   );
 * }
 * ```
 * 
 * 3. Remplacez votre système de routes:
 * ```javascript
 * // Au lieu de vérifier manuellement l'auth
 * if (!sessionStorage.user) {
 *   return <Navigate to="/login" />;
 * }
 * 
 * // Utilisez les composants de protection
 * <ProtectedRoute requiredRoles={['admin', 'teacher']}>
 *   <YourComponent />
 * </ProtectedRoute>
 * ```
 * 
 * 4. Mettez à jour vos composants pour utiliser les hooks:
 * ```javascript
 * // Au lieu de
 * const user = JSON.parse(sessionStorage.user || '{}');
 * 
 * // Utilisez
 * const { user, isAuthenticated } = useAuth();
 * ```
 * 
 * 5. Remplacez vos appels API:
 * ```javascript
 * // Au lieu de gérer manuellement les tokens
 * fetch('/api/endpoint', {
 *   headers: { 'Authorization': sessionStorage.user }
 * });
 * 
 * // Le service auth gère automatiquement les tokens
 * const response = await authService.makeRequest('/endpoint');
 * ```
 */