import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert } from 'react-bootstrap';
import { QrCodeScan } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { useAuth } from '../../hooks/useAuth';

const AttendanceTest = () => {
    const { user } = useAuth();
    const [studentId, setStudentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleManualScan = async (e) => {
        e.preventDefault();
        
        if (!studentId) {
            setMessage('Veuillez entrer un ID étudiant');
            setMessageType('danger');
            return;
        }

        try {
            setLoading(true);
            setMessage('');
            
            // Simuler le scan QR avec l'ID étudiant
            const qrCode = `STUDENT_ID_${studentId}`;
            
            const response = await secureApiEndpoints.supervisors.scanQR({
                student_qr_code: qrCode,
                supervisor_id: user.id
            });
            
            if (response.success) {
                setMessage(`✅ ${response.data.student_name} marqué(e) présent(e) à ${response.data.marked_at}`);
                setMessageType('success');
            } else {
                setMessage(`❌ ${response.message}`);
                setMessageType('danger');
            }
        } catch (error) {
            setMessage(`❌ Erreur: ${error.message}`);
            setMessageType('danger');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateQR = async () => {
        if (!studentId) {
            setMessage('Veuillez entrer un ID étudiant');
            setMessageType('danger');
            return;
        }

        try {
            setLoading(true);
            const response = await secureApiEndpoints.supervisors.generateStudentQR(studentId);
            
            if (response.success) {
                setMessage(`✅ QR généré pour ${response.data.student_name}`);
                setMessageType('success');
                
                // Ouvrir le QR code dans un nouvel onglet
                window.open(response.data.qr_url, '_blank');
            } else {
                setMessage(`❌ Erreur lors de la génération du QR`);
                setMessageType('danger');
            }
        } catch (error) {
            setMessage(`❌ Erreur: ${error.message}`);
            setMessageType('danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="py-4">
            <Row>
                <Col>
                    <h2 className="mb-4">
                        <QrCodeScan className="me-2" />
                        Test Système de Présences
                    </h2>
                </Col>
            </Row>

            <Row>
                <Col lg={8}>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Test Manuel</h5>
                        </Card.Header>
                        <Card.Body>
                            {message && (
                                <Alert variant={messageType} className="mb-3">
                                    {message}
                                </Alert>
                            )}
                            
                            <Form onSubmit={handleManualScan}>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>ID Étudiant</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={studentId}
                                                onChange={(e) => setStudentId(e.target.value)}
                                                placeholder="Ex: 1, 2, 3..."
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6} className="d-flex align-items-end">
                                        <div className="d-flex gap-2 mb-3">
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                disabled={loading}
                                            >
                                                {loading ? 'Traitement...' : 'Simuler Scan'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline-secondary"
                                                onClick={handleGenerateQR}
                                                disabled={loading}
                                            >
                                                Générer QR
                                            </Button>
                                        </div>
                                    </Col>
                                </Row>
                            </Form>

                            <hr />
                            
                            <div className="text-muted">
                                <h6>Instructions :</h6>
                                <ol>
                                    <li>Entrez l'ID d'un étudiant existant</li>
                                    <li>Cliquez sur "Simuler Scan" pour tester le marquage de présence</li>
                                    <li>Cliquez sur "Générer QR" pour voir le QR code de l'étudiant</li>
                                    <li>Utilisez le scanner QR réel pour scanner les codes</li>
                                </ol>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                
                <Col lg={4}>
                    <Card className="border-info">
                        <Card.Header className="bg-info text-white">
                            <h6 className="mb-0">Informations</h6>
                        </Card.Header>
                        <Card.Body>
                            <p><strong>Utilisateur :</strong> {user?.name}</p>
                            <p><strong>Rôle :</strong> {user?.role}</p>
                            <p><strong>ID Utilisateur :</strong> {user?.id}</p>
                            
                            <hr />
                            
                            <h6>Codes QR générés :</h6>
                            <p className="small text-muted">
                                Format: <code>STUDENT_ID_[ID]</code><br />
                                Exemple: <code>STUDENT_ID_1</code>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AttendanceTest;