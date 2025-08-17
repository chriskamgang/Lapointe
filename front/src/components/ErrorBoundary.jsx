import React from 'react';
import { Alert, Card, Button } from './UI';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Met à jour l'état pour afficher l'UI de fallback lors du prochain rendu
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log l'erreur pour le débogage
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Vous pouvez aussi logger l'erreur à un service de reporting d'erreurs ici
        if (typeof window !== 'undefined' && window.Swal) {
            window.Swal.fire({
                title: 'Erreur inattendue',
                text: 'Une erreur est survenue dans l\'application. Veuillez rafraîchir la page.',
                icon: 'error',
                confirmButtonText: 'Rafraîchir',
                allowOutsideClick: false
            }).then(() => {
                window.location.reload();
            });
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
    };

    render() {
        if (this.state.hasError) {
            // Interface de fallback personnalisée
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <Card className="max-w-lg w-full">
                        <Card.Content className="p-6 text-center">
                            <div className="mb-4">
                                <svg 
                                    className="mx-auto h-12 w-12 text-red-500" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                                    />
                                </svg>
                            </div>
                            
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Oups! Une erreur est survenue
                            </h2>
                            
                            <p className="text-gray-600 mb-6">
                                L'application a rencontré une erreur inattendue. 
                                Veuillez essayer de rafraîchir la page.
                            </p>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <Alert variant="error" className="mb-4 text-left">
                                    <details className="whitespace-pre-wrap">
                                        <summary className="cursor-pointer font-medium mb-2">
                                            Détails de l'erreur (développement)
                                        </summary>
                                        <div className="text-sm">
                                            <strong>Erreur:</strong> {this.state.error.toString()}
                                            <br />
                                            <strong>Stack trace:</strong>
                                            <pre className="mt-2 text-xs overflow-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    </details>
                                </Alert>
                            )}

                            <div className="flex gap-3 justify-center">
                                <Button 
                                    variant="primary" 
                                    onClick={this.handleReload}
                                >
                                    Rafraîchir la page
                                </Button>
                                
                                <Button 
                                    variant="outline" 
                                    onClick={this.handleReset}
                                >
                                    Réessayer
                                </Button>
                            </div>

                            <div className="mt-4 text-sm text-gray-500">
                                Si le problème persiste, contactez l'administrateur.
                            </div>
                        </Card.Content>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook pour gestion d'erreurs dans les composants fonctionnels
 */
export const useErrorHandler = () => {
    const handleError = React.useCallback((error, errorInfo) => {
        console.error('Error caught by useErrorHandler:', error, errorInfo);
        
        if (typeof window !== 'undefined' && window.Swal) {
            window.Swal.fire({
                title: 'Erreur',
                text: error.message || 'Une erreur est survenue',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }, []);

    return handleError;
};

/**
 * Composant wrapper pour gérer les erreurs async dans les composants fonctionnels
 */
export const AsyncErrorBoundary = ({ children, fallback }) => {
    const [error, setError] = React.useState(null);

    const resetError = () => setError(null);

    React.useEffect(() => {
        const handleUnhandledRejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            setError(event.reason);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    if (error) {
        if (fallback) {
            return fallback(error, resetError);
        }

        return (
            <div className="p-4">
                <Alert variant="error">
                    <div className="flex justify-between items-center">
                        <span>Une erreur est survenue: {error.message}</span>
                        <Button variant="outline" size="sm" onClick={resetError}>
                            Réessayer
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    return children;
};

export default ErrorBoundary;