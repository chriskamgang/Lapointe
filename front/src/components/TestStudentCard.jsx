import React, { useState } from 'react';
import { Button, Container, Row, Col } from 'react-bootstrap';
import StudentCard from './StudentCard';
import StudentCardPrint from './StudentCardPrint';

// Composant de test pour la carte étudiante
const TestStudentCard = () => {
    const [showPrintModal, setShowPrintModal] = useState(false);

    // Données d'exemple pour tester
    const sampleStudent = {
        id: 1,
        first_name: 'JORDAN JUNIOR',
        last_name: 'KENFACK',
        date_of_birth: '2000-05-11',
        place_of_birth: 'DOUALA',
        gender: 'male',
        phone: '***********',
        photo: null,
        matricule: 'FFRR0001AB',
        class_series: {
            name: 'Tle A4 ALL'
        },
        current_class: 'Tle A4 ALL'
    };

    const sampleSchoolYear = {
        year: '2022 - 2023'
    };

    return (
        <Container className="py-4">
            <Row>
                <Col md={12}>
                    <h2 className="mb-4">Test de la Carte Scolaire</h2>
                    
                    <div className="mb-4">
                        <h5>Aperçu de la carte:</h5>
                        <div className="d-flex justify-content-center p-3 bg-light">
                            <div style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}>
                                <StudentCard 
                                    student={sampleStudent}
                                    schoolYear={sampleSchoolYear}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <Button 
                            variant="primary" 
                            onClick={() => setShowPrintModal(true)}
                            size="lg"
                        >
                            🖨️ Tester l'impression
                        </Button>
                    </div>

                    {/* Modal d'impression */}
                    <StudentCardPrint
                        student={sampleStudent}
                        schoolYear={sampleSchoolYear}
                        show={showPrintModal}
                        onHide={() => setShowPrintModal(false)}
                        onPrintSuccess={() => {
                            console.log('Test d\'impression réussi');
                            setShowPrintModal(false);
                        }}
                    />
                </Col>
            </Row>
        </Container>
    );
};

export default TestStudentCard;