import React, { useState } from 'react';
import { Button, Container, Row, Col, Card } from 'react-bootstrap';
import { ArrowRightCircle } from 'react-bootstrap-icons';
import StudentTransfer from './StudentTransfer';

// Composant de test pour le transfert d'élève
const TestStudentTransfer = () => {
    const [showTransferModal, setShowTransferModal] = useState(false);

    // Données d'exemple pour tester
    const sampleStudent = {
        id: 123,
        first_name: 'Jean',
        last_name: 'DUPONT',
        student_number: 'STU001',
        class_series_id: 5,
        class_series: {
            id: 5,
            name: 'A',
            school_class: {
                id: 3,
                name: '6ème'
            }
        },
        current_class: '6ème A'
    };

    const handleTransferSuccess = (transferredStudent, newClassInfo) => {
        console.log('Transfert réussi !', {
            student: transferredStudent,
            newClass: newClassInfo
        });
        
        alert(`Élève ${transferredStudent.first_name} ${transferredStudent.last_name} transféré vers ${newClassInfo.className} - ${newClassInfo.seriesName}`);
    };

    return (
        <Container className="py-4">
            <Row>
                <Col md={12}>
                    <h2 className="mb-4">Test du Transfert d'Élève</h2>
                    
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">Élève d'exemple</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <p><strong>Nom :</strong> {sampleStudent.first_name} {sampleStudent.last_name}</p>
                                    <p><strong>N° étudiant :</strong> {sampleStudent.student_number}</p>
                                </Col>
                                <Col md={6}>
                                    <p><strong>Classe actuelle :</strong> {sampleStudent.current_class}</p>
                                    <p><strong>ID Série :</strong> {sampleStudent.class_series_id}</p>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    <div className="text-center">
                        <Button 
                            variant="warning" 
                            onClick={() => setShowTransferModal(true)}
                            size="lg"
                        >
                            <ArrowRightCircle className="me-2" />
                            Tester le transfert
                        </Button>
                    </div>

                    <div className="mt-4">
                        <Card bg="light">
                            <Card.Body>
                                <h6>Instructions de test :</h6>
                                <ul>
                                    <li>Cliquez sur "Tester le transfert" pour ouvrir le modal</li>
                                    <li>Sélectionnez une nouvelle classe de destination</li>
                                    <li>Choisissez une série dans cette classe</li>
                                    <li>Confirmez le transfert pour voir le résultat</li>
                                </ul>
                                
                                <small className="text-muted">
                                    <strong>Note :</strong> Ce test utilise des données d'exemple. 
                                    Dans l'application réelle, les données viennent de la base de données.
                                </small>
                            </Card.Body>
                        </Card>
                    </div>

                    {/* Modal de transfert */}
                    <StudentTransfer
                        student={sampleStudent}
                        show={showTransferModal}
                        onHide={() => setShowTransferModal(false)}
                        onTransferSuccess={handleTransferSuccess}
                    />
                </Col>
            </Row>
        </Container>
    );
};

export default TestStudentTransfer;