import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Table, Badge } from 'react-bootstrap';
import { Search, CashCoin, Shift, Laptop, FileEarmarkText, Gift, Reply, Trash } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';

const PaymentEquipmentPage = () => {
    const [studentId, setStudentId] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [equipmentStatus, setEquipmentStatus] = useState({});
    const [scholarshipInfo, setScholarshipInfo] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [equipmentPayments, setEquipmentPayments] = useState([]);
    const [ramesPhysical, setRamesPhysical] = useState(false);

    const loadStudentData = async () => {
        if (!studentId) return;
        
        setLoading(true);
        try {
            const statusResponse = await secureApiEndpoints.payments.getCompleteStudentStatus(studentId);
            if (statusResponse.success) {
                setStudentData(statusResponse.data.student);
                setPaymentStatus(statusResponse.data.payment_status);
                setEquipmentStatus(statusResponse.data.equipment_details || {});
                setScholarshipInfo(statusResponse.data.scholarship_info);
            } else {
                throw new Error(statusResponse.message);
            }

            const historyResponse = await secureApiEndpoints.payments.getStudentPaymentHistory(studentId);
            if (historyResponse.success) {
                setPaymentHistory(historyResponse.data);
            } else {
                throw new Error(historyResponse.message);
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            alert('Erreur lors du chargement des données de l\'étudiant: ' + error.message);
            setStudentData(null);
            setPaymentStatus(null);
            setEquipmentStatus({});
            setScholarshipInfo(null);
            setPaymentHistory([]);
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
                await loadStudentData();
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

    const handleCancelPayment = async (paymentId) => {
        if (window.confirm('Êtes-vous sûr de vouloir annuler ce paiement ? Cette action est irréversible.')) {
            setLoading(true);
            try {
                const response = await secureApiEndpoints.payments.cancelPayment(paymentId);
                if (response.success) {
                    alert('Paiement annulé avec succès.');
                    await loadStudentData();
                } else {
                    alert('Erreur lors de l\'annulation: ' + response.message);
                }
            } catch (error) {
                console.error('Erreur annulation paiement:', error);
                alert('Erreur lors de l\'annulation du paiement.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUndoEquipment = async (equipmentType) => {
        if (window.confirm(`Êtes-vous sûr de vouloir annuler le paiement pour "${getEquipmentLabel(equipmentType)}"?`)) {
            setLoading(true);
            try {
                const response = await secureApiEndpoints.payments.undoEquipmentPayment(studentData.id, equipmentType);
                if (response.success) {
                    alert('Statut de l\'équipement annulé.');
                    await loadStudentData();
                } else {
                    alert('Erreur: ' + response.message);
                }
            } catch (error) {
                console.error('Erreur annulation équipement:', error);
                alert('Erreur lors de l\'annulation du statut de l\'équipement.');
            } finally {
                setLoading(false);
            }
        }
    };
    
    const handleUndoRame = async () => {
        if (window.confirm('Êtes-vous sûr de vouloir annuler le statut "Rames apportées"?')) {
            setLoading(true);
            try {
                const response = await secureApiEndpoints.payments.undoRameBrought(studentData.id);
                if (response.success) {
                    alert('Statut des rames annulé.');
                    await loadStudentData();
                } else {
                    alert('Erreur: ' + response.message);
                }
            } catch (error) {
                console.error('Erreur annulation rames:', error);
                alert('Erreur lors de l\'annulation du statut des rames.');
            } finally {
                setLoading(false);
            }
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
                    <h2 className="mb-3">Caisse et Paiements</h2>
                    <p className="text-muted">
                        Gérer les paiements de scolarité, les équipements et consulter l\'historique.
                    </p>
                </Col>
            </Row>

            <Card className="mb-4">
                <Card.Header>
                    <h5 className="mb-0">Rechercher un étudiant</h5>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={8}>
                            <Form.Control
                                type="text"
                                placeholder="ID, matricule ou nom de l\'étudiant"
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
                                            <p><strong>Reste à payer:</strong> {calculateTotalWithScholarship().toLocaleString()} FCFA</p>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {Object.keys(equipmentStatus).length > 0 && (
                        <Card className="mb-4">
                            <Card.Header>
                                <h5 className="mb-0">Équipements et Rames</h5>
                            </Card.Header>
                            <Card.Body>
                                <Table responsive hover>
                                    <thead>
                                        <tr>
                                            <th>Équipement</th>
                                            <th>Prix</th>
                                            <th>Statut</th>
                                            <th className="text-center">Action / Paiement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(equipmentStatus).map(([type, equipment]) => (
                                            <tr key={type}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        {getEquipmentIcon(type)}
                                                        <span className="ms-2 fw-bold">{getEquipmentLabel(type)}</span>
                                                    </div>
                                                </td>
                                                <td>{equipment.price?.toLocaleString()} FCFA</td>
                                                <td>
                                                    {equipment.brought_physical ? <Badge bg="info">Apporté physiquement</Badge> :
                                                     equipment.has_paid ? <Badge bg="success">Payé</Badge> : 
                                                     <Badge bg="danger">Non payé</Badge>}
                                                </td>
                                                <td className="text-center">
                                                    {equipment.has_paid ? (
                                                        <Button variant="outline-danger" size="sm" onClick={() => equipment.brought_physical ? handleUndoRame() : handleUndoEquipment(type)}>
                                                            <Reply className="me-1" /> Annuler
                                                        </Button>
                                                    ) : (
                                                        type === 'rame' ? (
                                                            <Form.Check
                                                                type="checkbox"
                                                                label="Apport physique"
                                                                checked={ramesPhysical}
                                                                onChange={(e) => setRamesPhysical(e.target.checked)}
                                                            />
                                                        ) : (
                                                            <Form.Control
                                                                type="number"
                                                                size="sm"
                                                                placeholder="Montant"
                                                                style={{ width: '120px', margin: 'auto' }}
                                                                onChange={(e) => handleEquipmentPayment(type, e.target.value)}
                                                            />
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}

                    <Card className="mb-4">
                        <Card.Header>
                            <h5 className="mb-0"><CashCoin className="me-2" /> Nouveau Paiement</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Montant du paiement *</Form.Label>
                                        <Form.Control type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Montant en FCFA" />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Méthode de paiement *</Form.Label>
                                        <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                            <option value="cash">Espèces</option>
                                            <option value="card">Carte bancaire</option>
                                            <option value="transfer">Virement</option>
                                            <option value="check">Chèque</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4} className="d-flex align-items-end">
                                    <Button variant="success" onClick={handleProcessPayment} disabled={loading || !paymentAmount} className="w-100 mb-3">
                                        <CashCoin className="me-2" /> Traiter le paiement
                                    </Button>
                                </Col>
                            </Row>
                            {(paymentAmount || equipmentPayments.length > 0) && (
                                <Alert variant="info">
                                    <strong>Récapitulatif:</strong><br />
                                    Paiement scolarité: {parseFloat(paymentAmount || 0).toLocaleString()} FCFA<br />
                                    {equipmentPayments.map(ep => (
                                        <span key={ep.type}>{getEquipmentLabel(ep.type)}: {ep.amount.toLocaleString()} FCFA<br /></span>
                                    ))}
                                    {ramesPhysical && <span>Rames: Apportées physiquement<br /></span>}
                                    <strong>Total: {(parseFloat(paymentAmount || 0) + equipmentPayments.reduce((sum, ep) => sum + ep.amount, 0)).toLocaleString()} FCFA</strong>
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Historique des Paiements</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Reçu N°</th>
                                        <th>Montant</th>
                                        <th>Méthode</th>
                                        <th>Notes</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.length > 0 ? paymentHistory.map(p => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                                            <td>{p.receipt_number}</td>
                                            <td>{p.total_amount.toLocaleString()} FCFA</td>
                                            <td>{p.payment_method}</td>
                                            <td>{p.notes}</td>
                                            <td className="text-center">
                                                <Button variant="danger" size="sm" onClick={() => handleCancelPayment(p.id)} disabled={loading}>
                                                    <Trash className="me-1" /> Annuler
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="text-center text-muted">Aucun paiement enregistré.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </>
            )}

            {loading && (
                <div className="position-fixed top-50 start-50 translate-middle bg-dark bg-opacity-50 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050 }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Traitement en cours...</span>
                    </div>
                </div>
            )}
        </Container>
    );
};

export default PaymentEquipmentPage;
