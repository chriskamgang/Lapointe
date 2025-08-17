import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap';
import { Plus, Palette } from 'react-bootstrap-icons';
import StudentActionsDropdown from './StudentActionsDropdown';
import ColorPicker from './ColorPicker';
import { useTheme } from '../contexts/ThemeContext';

const TestStudentActionsAndTheme = () => {
    const { primaryColor, changePrimaryColor } = useTheme();
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Données d'exemple
    const sampleStudents = [
        {
            id: 1,
            first_name: 'Jean',
            last_name: 'DUPONT',
            student_number: 'STU001',
            gender: 'M',
            date_of_birth: '2005-03-15'
        },
        {
            id: 2,
            first_name: 'Marie',
            last_name: 'MARTIN',
            student_number: 'STU002',
            gender: 'F',
            date_of_birth: '2005-07-22'
        },
        {
            id: 3,
            first_name: 'Pierre',
            last_name: 'BERNARD',
            student_number: 'STU003',
            gender: 'M',
            date_of_birth: '2005-11-08'
        }
    ];

    // Handlers pour les actions
    const handleAction = (action, student) => {
        alert(`Action "${action}" pour l'élève ${student.first_name} ${student.last_name}`);
    };

    return (
        <Container className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2 className="text-primary">Test des Actions Étudiants & Thème</h2>
                    <p className="text-muted">
                        Testez le menu dropdown des actions et la personnalisation des couleurs
                    </p>
                </Col>
            </Row>

            {/* Contrôles de thème */}
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <Palette className="me-2" />
                                Contrôles du Thème
                            </h5>
                            <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => setShowColorPicker(!showColorPicker)}
                            >
                                {showColorPicker ? 'Masquer' : 'Changer couleur'}
                            </Button>
                        </Card.Header>
                        {showColorPicker && (
                            <Card.Body>
                                <ColorPicker
                                    value={primaryColor}
                                    onChange={changePrimaryColor}
                                    label="Couleur primaire de l'application"
                                />
                            </Card.Body>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Démonstration des éléments avec couleur primaire */}
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Démonstration des Couleurs</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                <Button variant="primary">Bouton Primary</Button>
                                <Button variant="outline-primary">Outline Primary</Button>
                                <span className="badge bg-primary">Badge Primary</span>
                                <span className="text-primary">Texte Primary</span>
                            </div>
                            
                            <div className="mb-3">
                                <div className="progress" style={{ height: '10px' }}>
                                    <div 
                                        className="progress-bar" 
                                        style={{ width: '60%', backgroundColor: primaryColor }}
                                    />
                                </div>
                            </div>

                            <p>
                                <a href="#" className="text-primary">Lien avec couleur primaire</a> - 
                                Les liens utilisent automatiquement la couleur primaire définie.
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Tableau avec dropdown actions */}
            <Row>
                <Col>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Liste des Étudiants avec Actions</h5>
                            <Button variant="primary" size="sm">
                                <Plus className="me-1" />
                                Nouvel élève
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive hover className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>N°</th>
                                        <th>Nom</th>
                                        <th>Prénom</th>
                                        <th>Genre</th>
                                        <th>Date de naissance</th>
                                        <th width="80">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sampleStudents.map((student) => (
                                        <tr key={student.id}>
                                            <td>{student.student_number}</td>
                                            <td><strong>{student.last_name}</strong></td>
                                            <td>{student.first_name}</td>
                                            <td>
                                                <span className={`badge ${student.gender === 'M' ? 'bg-info' : 'bg-pink'}`}>
                                                    {student.gender}
                                                </span>
                                            </td>
                                            <td>{new Date(student.date_of_birth).toLocaleDateString('fr-FR')}</td>
                                            <td>
                                                <StudentActionsDropdown
                                                    student={student}
                                                    onPrintCard={(s) => handleAction('Imprimer carte', s)}
                                                    onTransfer={(s) => handleAction('Transférer', s)}
                                                    onEdit={(s) => handleAction('Modifier', s)}
                                                    onDelete={(s) => handleAction('Supprimer', s)}
                                                    onViewPayments={(s) => handleAction('Voir paiements', s)}
                                                    onViewStudent={(s) => handleAction('Voir détails', s)}
                                                    userRole="admin"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col>
                    <Card bg="light">
                        <Card.Body>
                            <h6>Instructions :</h6>
                            <ul>
                                <li>Utilisez le sélecteur de couleur pour changer le thème</li>
                                <li>Observez comment les boutons, liens et éléments changent de couleur</li>
                                <li>Cliquez sur les menus "⋮" pour tester les actions des étudiants</li>
                                <li>Les changements de couleur sont appliqués en temps réel</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <style jsx>{`
                .bg-pink {
                    background-color: #e83e8c !important;
                }
            `}</style>
        </Container>
    );
};

export default TestStudentActionsAndTheme;