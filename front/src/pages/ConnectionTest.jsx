import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { secureApiEndpoints } from '../utils/apiMigration';
import { host } from '../utils/fetch';

const ConnectionTest = () => {
    const [testResults, setTestResults] = useState({
        basicApi: null,
        authApi: null,
        schoolSettings: null
    });
    const [loading, setLoading] = useState(false);

    const testBasicConnection = async () => {
        try {
            const response = await fetch(`${host}/api/test`);
            const data = await response.json();
            return { success: true, data: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const testSecureApi = async () => {
        try {
            const response = await secureApiEndpoints.schoolSettings.get();
            return { success: true, data: 'Connexion sécurisée OK' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const runAllTests = async () => {
        setLoading(true);
        
        const basicResult = await testBasicConnection();
        setTestResults(prev => ({ ...prev, basicApi: basicResult }));
        
        const secureResult = await testSecureApi();
        setTestResults(prev => ({ ...prev, authApi: secureResult }));
        
        setLoading(false);
    };

    useEffect(() => {
        runAllTests();
    }, []);

    const getStatusBadge = (result) => {
        if (result === null) return <Badge bg="secondary">En attente...</Badge>;
        if (result.success) return <Badge bg="success">✅ OK</Badge>;
        return <Badge bg="danger">❌ Échec</Badge>;
    };

    return (
        <Container fluid className="py-4">
            <Row>
                <Col>
                    <h2 className="mb-4">Test de Connexion Serveur</h2>
                </Col>
            </Row>

            <Row>
                <Col lg={8}>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Résultats des Tests</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-3">
                                <strong>Configuration actuelle :</strong>
                                <ul className="mt-2">
                                    <li>URL Backend : <code>{host}</code></li>
                                    <li>Frontend : <code>http://127.0.0.1:3006</code></li>
                                </ul>
                            </div>

                            <hr />

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span><strong>API de base (/api/test)</strong></span>
                                    {getStatusBadge(testResults.basicApi)}
                                </div>
                                {testResults.basicApi && (
                                    <small className="text-muted">
                                        {testResults.basicApi.success 
                                            ? `Réponse: ${testResults.basicApi.data}`
                                            : `Erreur: ${testResults.basicApi.error}`
                                        }
                                    </small>
                                )}
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span><strong>API sécurisée (avec JWT)</strong></span>
                                    {getStatusBadge(testResults.authApi)}
                                </div>
                                {testResults.authApi && (
                                    <small className="text-muted">
                                        {testResults.authApi.success 
                                            ? `Réponse: ${testResults.authApi.data}`
                                            : `Erreur: ${testResults.authApi.error}`
                                        }
                                    </small>
                                )}
                            </div>

                            <hr />

                            <Button 
                                onClick={runAllTests} 
                                disabled={loading}
                                variant="primary"
                            >
                                {loading ? 'Test en cours...' : 'Relancer les Tests'}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="border-info">
                        <Card.Header className="bg-info text-white">
                            <h6 className="mb-0">Instructions</h6>
                        </Card.Header>
                        <Card.Body>
                            <ol>
                                <li>Vérifiez que le serveur Laravel tourne sur le port 8000</li>
                                <li>Vérifiez que React tourne sur le port 3006</li>
                                <li>Vérifiez les configurations CORS</li>
                                <li>Testez la connexion avec cette page</li>
                            </ol>
                            
                            <hr />
                            
                            <h6>Commandes utiles :</h6>
                            <code>php artisan serve</code><br />
                            <code>npm start</code>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ConnectionTest;