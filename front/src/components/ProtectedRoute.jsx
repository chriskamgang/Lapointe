import { Navigate, useLocation } from "react-router-dom";
import { useAuth, usePermissions } from "../hooks/useAuth";
import { Alert, LoadingSpinner } from "./UI";

/**
 * Composant de protection des routes avec authentification et autorisation
 */
const ProtectedRoute = ({
  children,
  requiredRoles = [],
  requireAuth = true,
  fallbackPath = "/login",
  unauthorizedComponent = null,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { canAccess } = usePermissions();
  const location = useLocation();

  // Affichage du loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Vérification des permissions..." size="lg" />
      </div>
    );
  }

  // Vérifier l'authentification
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Vérifier les rôles requis
  if (requiredRoles.length > 0 && !canAccess(requiredRoles)) {
    if (unauthorizedComponent) {
      return unauthorizedComponent;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="error" className="text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Accès non autorisé</h3>
              <p className="text-sm">
                Vous n'avez pas les permissions nécessaires pour accéder à cette
                page.
              </p>
              {user && (
                <p className="text-xs mt-2 opacity-75">
                  Connecté en tant que: {user.username} ({user.role})
                </p>
              )}
            </div>
            <button
              onClick={() => window.history.back()}
              className="bg-white text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
            >
              Retour
            </button>
          </Alert>
        </div>
      </div>
    );
  }

  // Rendre le composant protégé
  return children;
};

/**
 * Composant HOC pour protéger facilement les routes
 */
export const withAuth = (Component, options = {}) => {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

/**
 * Composant pour les routes réservées aux administrateurs
 */
export const AdminRoute = ({ children, fallbackPath = "/" }) => {
  return (
    <ProtectedRoute requiredRoles={["admin"]} fallbackPath={fallbackPath}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Composant pour les routes réservées aux enseignants et administrateurs
 */
export const TeacherRoute = ({ children, fallbackPath = "/" }) => {
  return (
    <ProtectedRoute
      requiredRoles={["admin", "teacher"]}
      fallbackPath={fallbackPath}
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * Composant pour les routes réservées aux comptables et administrateurs
 */
export const AccountantRoute = ({ children, fallbackPath = "/" }) => {
  return (
    <ProtectedRoute
      requiredRoles={["admin", "accountant", "comptable_superieur"]}
      fallbackPath={fallbackPath}
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * Composant pour les routes réservées à la gestion des besoins (admin et comptable supérieur)
 */
export const NeedsManagementRoute = ({ children, fallbackPath = "/" }) => {
  return (
    <ProtectedRoute
      requiredRoles={["admin", "comptable_superieur"]}
      fallbackPath={fallbackPath}
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * Composant pour les routes réservées à l'inventaire (admin, comptable et comptable supérieur)
 */
export const InventoryRoute = ({ children, fallbackPath = "/" }) => {
  return (
    <ProtectedRoute
      requiredRoles={["admin", "accountant", "comptable_superieur"]}
      fallbackPath={fallbackPath}
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * Composant pour les routes publiques (accessible uniquement si non connecté)
 */
export const PublicRoute = ({ children, redirectPath = "/" }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Chargement..." size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

/**
 * Hook pour vérifier les permissions dans les composants
 */
export const useRouteProtection = (requiredRoles = []) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccess } = usePermissions();

  const isAuthorized =
    isAuthenticated && (requiredRoles.length === 0 || canAccess(requiredRoles));

  return {
    isAuthenticated,
    isAuthorized,
    isLoading,
    canAccess: (roles) => canAccess(roles),
  };
};

/**
 * Composant de redirection conditionelle basée sur le rôle
 */
export const RoleBasedRedirect = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Redirection..." size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirection basée sur le rôle si on est sur la racine
  if (location.pathname === "/" && user?.role) {
    const defaultPaths = {
      admin: "/sections",
      teacher: "/students",
      accountant: "/class-comp",
      comptable_superieur: "/class-comp",
      surveillant_general: "/attendance",
      user: "/profile",
    };

    const defaultPath = defaultPaths[user.role] || "/dashboard";
    return <Navigate to={defaultPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
