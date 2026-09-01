import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Table, Badge } from 'react-bootstrap';
import { Search, CashCoin, Shift, Laptop, FileEarmarkText, Gift } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';

const PaymentEquipmentPage = () => {
    const [studentId, setStudentId] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [equipmentStatus, setEquipmentStatus] = useState({});
    const [scholarshipInfo, setScholarshipInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [equipmentPayments, setEquipmentPayments] = useState([]);
    const [ramesPhysical, setRamesPhysical] = useState(false);

    const loadStudentData = async () => {
        if (!studentId) return;
        
        setLoading(true);
        try {
            // Charger le statut complet de l'étudiant
            const response = await secureApiEndpoints.payments.getCompleteStudentStatus(studentId);
            
            if (response.success) {
                setStudentData(response.data.student);
                setPaymentStatus(response.data.payment_status);
                setEquipmentStatus(response.data.equipment_details || {});
                setScholarshipInfo(response.data.scholarship_info);
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            alert('Erreur lors du chargement des données de l\'étudiant');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessPayment = async () => {
        if (!studentData || !paymentAmount) {
            alert('Veuillez remplir tous les champs requis');
            return;
        }

        try {
            setLoading(true);

            const paymentData = {
                student_id: studentData.id,
                total_amount: parseFloat(paymentAmount),
                payment_method: paymentMethod,
                payment_date: new Date().toISOString().split('T')[0],
                versement_date: new Date().toISOString().split('T')[0],
                equipment_payments: equipmentPayments.filter(ep => ep.amount > 0),
                rames_physical: ramesPhysical
            };

            const response = await secureApiEndpoints.payments.processWithEquipment(paymentData);

            if (response.success) {
                alert('Paiement traité avec succès!');
                // Recharger les données
                await loadStudentData();
                // Reset form
                setPaymentAmount('');
                setEquipmentPayments([]);
                setRamesPhysical(false);
            } else {
                alert('Erreur: ' + response.message);
            }
        } catch (error) {
            console.error('Erreur paiement:', error);
            alert('Erreur lors du traitement du paiement');
        } finally {
            setLoading(false);
        }
    };

    const handleEquipmentPayment = (equipmentType, amount) => {
        setEquipmentPayments(prev => {
            const existing = prev.find(ep => ep.type === equipmentType);
            if (existing) {
                return prev.map(ep => 
                    ep.type === equipmentType ? { ...ep, amount: parseFloat(amount) || 0 } : ep
                );
            } else {
                return [...prev, { type: equipmentType, amount: parseFloat(amount) || 0 }];
            }
        });
    };

    const getEquipmentIcon = (type) => {
        const icons = {
            'polo': <Shift className="text-primary" />,
            'blouse': <Shift className="text-success" />,
            'laptop': <Laptop className="text-info" />,
            'rame': <FileEarmarkText className="text-warning" />
        };
        return icons[type] || <FileEarmarkText />;
    };

    const getEquipmentLabel = (type) => {
        const labels = {
            'polo': 'Polo École',
            'blouse': 'Blouse Médicale',
            'laptop': 'Ordinateur Portable',
            'rame': 'Rames de Papier'
        };
        return labels[type] || type;
    };

    const calculateTotalWithScholarship = () => {
        if (!paymentStatus || !scholarshipInfo) return 0;
        
        const baseRemaining = paymentStatus.total_remaining || 0;
        const scholarshipAmount = scholarshipInfo.eligible ? scholarshipInfo.amount : 0;
        
        return Math.max(0, baseRemaining - scholarshipAmount);
    };

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2 className="mb-3">Paiements avec Équipements</h2>
                    <p className="text-muted">
                        Gérer les paiements de scolarité et d\'équipements en une seule transaction
                    </p>
                </Col>
            </Row>

            {/* Recherche étudiant */}
            <Card className="mb-4">
                <Card.Header>
                    <h5 className="mb-0">Rechercher un étudiant</h5>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={8}>
                            <Form.Control
                                type="text"
                                placeholder="ID ou nom de l\'étudiant"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && loadStudentData()}
                            />
                        </Col>
                        <Col md={4}>
                            <Button 
                                variant="primary" 
                                onClick={loadStudentData}
                                disabled={loading}
                                className="w-100"
                            >
                                <Search className="me-2" />
                                Rechercher
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {studentData && (
                <>
                    {/* Informations étudiant */}
                    <Card className="mb-4">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Informations de l\'étudiant</h5>
                            <Badge bg="primary">
                                {studentData.classSeries?.schoolClass?.level?.school?.name}
                            </Badge>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <p><strong>Nom:</strong> {studentData.first_name} {studentData.last_name}</p>
                                    <p><strong>Classe:</strong> {studentData.classSeries?.schoolClass?.name}</p>
                                    <p><strong>Niveau:</strong> {studentData.classSeries?.schoolClass?.level?.name}</p>
                                </Col>
                                <Col md={6}>
                                    {scholarshipInfo?.eligible && (
                                        <Alert variant="success">
                                            <Gift className="me-2" />
                                            <strong>Bourse éligible:</strong> {scholarshipInfo.amount?.toLocaleString()} FCFA
                                        </Alert>
                                    )}
                                    {paymentStatus && (
                                        <div>
                                            <p><strong>Total à payer:</strong> {paymentStatus.total_required?.toLocaleString()} FCFA</p>
                                            <p><strong>Déjà payé:</strong> {paymentStatus.total_paid?.toLocaleString()} FCFA</p>
                                            <p><strong>Reste (avec bourse):</strong> {calculateTotalWithScholarship().toLocaleString()} FCFA</p>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Statut équipements */}
                    {Object.keys(equipmentStatus).length > 0 && (
                        <Card className="mb-4">
                            <Card.Header>
                                <h5 className="mb-0">Équipements requis</h5>
                            </Card.Header>
                            <Card.Body>
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>Équipement</th>
                                            <th>Prix</th>
                                            <th>Statut</th>
                                            <th>Paiement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(equipmentStatus).map(([type, equipment]) => (
                                            <tr key={type}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        {getEquipmentIcon(type)}
                                                        <span className="ms-2">{getEquipmentLabel(type)}</span>
                                                    </div>
                                                </td>
                                                <td>{equipment.price?.toLocaleString()} FCFA</td>
                                                <td>
                                                    {equipment.has_paid ? (
                                                        <Badge bg="success">Payé</Badge>
                                                    ) : (
                                                        <Badge bg="danger">Non payé</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    {!equipment.has_paid && (
                                                        <Form.Control
                                                            type="number"
                                                            size="sm"
                                                            placeholder="Montant"
                                                            style={{ width: '120px' }}
                                                            onChange={(e) => handleEquipmentPayment(type, e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                {/* Option rames physiques */}
                                {equipmentStatus.rame && !equipmentStatus.rame.has_paid && (
                                    <div className="mt-3">
                                        <Form.Check
                                            type="checkbox"
                                            label="L\'étudiant apporte ses rames physiques (pas de paiement)"
                                            checked={ramesPhysical}
                                            onChange={(e) => setRamesPhysical(e.target.checked)}
                                        />
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    )}

                    {/* Formulaire de paiement */}
                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0">
                                <CashCoin className="me-2" />
                                Traitement du paiement
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Montant du paiement *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            placeholder="Montant en FCFA"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Méthode de paiement *</Form.Label>
                                        <Form.Select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        >
                                            <option value="cash">Espèces</option>
                                            <option value="card">Carte bancaire</option>
                                            <option value="transfer">Virement</option>
                                            <option value="check">Chèque</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4} className="d-flex align-items-end">
                                    <Button
                                        variant="primary" 
                                        onClick={loadStudentData}
                                        disabled={loading}
                                        className="w-100"
                                    >
                                        <Search className="me-2" />
                                        Rechercher
                                    </Button>
                                </Col>
                            </Row>

                            {/* Récapitulatif */}
                            {(paymentAmount || equipmentPayments.length > 0) && (
                                <Alert variant="info">
                                    <strong>Récapitulatif:</strong><br />
                                    Paiement scolarité: {parseFloat(paymentAmount || 0).toLocaleString()} FCFA<br />
                                    {equipmentPayments.map(ep => (
                                        <span key={ep.type}>
                                            {getEquipmentLabel(ep.type)}: {ep.amount.toLocaleString()} FCFA<br />
                                        </span>
                                    ))}
                                    {ramesPhysical && <span>Rames: Apportées physiquement<br /></span>}
                                    <strong>Total: {( 
                                        parseFloat(paymentAmount || 0) + 
                                        equipmentPayments.reduce((sum, ep) => sum + ep.amount, 0)
                                    ).toLocaleString()} FCFA</strong>
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </>
            )}

            {loading && (
                <div className="position-fixed top-50 start-50 translate-middle">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Traitement en cours...</span>
                    </div>
                </div>
            )}
        </Container>
    );
};

export default PaymentEquipmentPage;