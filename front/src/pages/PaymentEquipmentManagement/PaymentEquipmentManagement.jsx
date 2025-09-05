import React, { useState, useEffect } from 'react';
import { Card, Badge, Form, Button, Alert, Modal, Table, Row, Col } from 'react-bootstrap';
import { Check2Circle, ExclamationTriangle, Gift, Laptop, Shirt, FileEarmarkText, CashCoin } from 'react-bootstrap-icons';

const PaymentEquipmentManagement = ({ student, schoolYear, onPaymentUpdate }) => {
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [equipmentStatus, setEquipmentStatus] = useState({});
    const [loading, setLoading] = useState(true);
    const [showDistributionModal, setShowDistributionModal] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [scholarshipInfo, setScholarshipInfo] = useState(null);

    useEffect(() => {
        if (student && schoolYear) {
            loadPaymentAndEquipmentStatus();
        }
    }, [student, schoolYear]);

    const loadPaymentAndEquipmentStatus = async () => {
        try {
            setLoading(true);
            
            // Charger le statut de paiement de l'étudiant
            const paymentResponse = await fetch(`/api/students/${student.id}/payment-status/${schoolYear.id}`);
            const paymentData = await paymentResponse.json();
            
            // Charger le statut des équipements
            const equipmentResponse = await fetch(`/api/students/${student.id}/equipment-status/${schoolYear.id}`);
            const equipmentData = await equipmentResponse.json();
            
            // Charger les informations de bourse
            const scholarshipResponse = await fetch(`/api/students/${student.id}/scholarship-info/${schoolYear.id}`);
            const scholarshipData = await scholarshipResponse.json();

            if (paymentData.success) {
                setPaymentStatus(paymentData.data);
            }
            
            if (equipmentData.success) {
                setEquipmentStatus(equipmentData.data);
            }

            if (scholarshipData.success) {
                setScholarshipInfo(scholarshipData.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkEquipmentAsReceived = async (equipmentType) => {
        try {
            const response = await fetch('/api/equipment-distribution/mark-as-distributed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_id: student.id,
                    equipment_type: equipmentType,
                    notes: `Distribution manuelle via interface de paiement`
                })
            });

            const result = await response.json();
            
            if (result.success) {
                await loadPaymentAndEquipmentStatus();
                setShowDistributionModal(false);
                onPaymentUpdate && onPaymentUpdate();
            } else {
                alert('Erreur: ' + result.message);
            }
        } catch (error) {
            console.error('Erreur lors de la distribution:', error);
            alert('Erreur lors de la distribution de l\'équipement');
        }
    };

    const handleMarkRamesAsPhysical = async () => {
        try {
            const response = await fetch('/api/equipment-distribution/mark-rames-physical', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_id: student.id,
                    notes: 'Rames physiques apportées par l\'étudiant'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                await loadPaymentAndEquipmentStatus();
                onPaymentUpdate && onPaymentUpdate();
            } else {
                alert('Erreur: ' + result.message);
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            alert('Erreur lors de la mise à jour du statut des rames');
        }
    };

    const getEquipmentIcon = (type) => {
        switch (type) {
            case 'polo': return <Shirt className="me-2 text-primary" />;
            case 'blouse': return <Shirt className="me-2 text-success" />;
            case 'laptop': return <Laptop className="me-2 text-info" />;
            case 'rame': return <FileEarmarkText className="me-2 text-warning" />;
            default: return <Gift className="me-2 text-secondary" />;
        }
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

    const getStatusBadge = (equipment) => {
        if (!equipment.has_paid_for) {
            return <Badge bg="danger">Non payé</Badge>;
        }
        
        if (equipment.equipment_type === 'rame' && equipment.brought_physical) {
            return <Badge bg="info">Rames physiques</Badge>;
        }
        
        if (equipment.has_received) {
            return <Badge bg="success">Distribué</Badge>;
        }
        
        if (equipment.has_paid_for && !equipment.has_received) {
            return <Badge bg="warning">En attente</Badge>;
        }
        
        return <Badge bg="secondary">Statut inconnu</Badge>;
    };

    const calculateScholarshipImpact = () => {
        if (!scholarshipInfo || !scholarshipInfo.eligible) return null;

        const { school_code, level_type, speciality, current_level } = student;
        let scholarshipAmount = 0;

        // Calcul des bourses selon les règles spécifiées
        if (school_code === 'INSSAS') {
            if (level_type === 'BTS' || level_type === 'HND') {
                scholarshipAmount = current_level === 1 ? 50000 : 100000;
            } else if (level_type === 'DOUBLE_DIPLOMATION') {
                scholarshipAmount = current_level === 1 ? 50000 : 100000;
            } else if (level_type === 'LICENCE_PRO') {
                scholarshipAmount = 100000;
            } else if (level_type === 'MASTER_PRO') {
                scholarshipAmount = current_level <= 2 ? 150000 : 0;
            }
        } else if (school_code === 'ESGIT') {
            if (level_type === 'LICENCE_PRO') {
                // Bourses selon mention BTS
                const mention = scholarshipInfo.bts_mention || 'passable';
                const scholarships = {
                    'passable': 50000,
                    'assez_bien': 100000,
                    'bien': 120000,
                    'tres_bien': 150000
                };
                scholarshipAmount = scholarships[mention] || 0;
            } else if (level_type === 'INGENIERIE') {
                scholarshipAmount = 50000; // Par an pour 3ème année
            }
        } else if (school_code === 'ESSIT') {
            if (level_type === 'INGENIERIE_SC') {
                scholarshipAmount = 50000; // Niveaux 3,4,5
            }
        } else if (school_code === 'ISTPM') {
            scholarshipAmount = 25000; // CQP et DQP
        }

        return scholarshipAmount;
    };

    if (loading) {
        return (
            <Card>
                <Card.Body className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    const scholarshipAmount = calculateScholarshipImpact();

    return (
        <div className="space-y-4">
            {/* Informations de l'étudiant et bourses */}
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        <CashCoin className="me-2" />
                        Gestion des Paiements et Équipements
                    </h5>
                    <Badge bg="primary">{student.classSeries?.schoolClass?.level?.school?.name}</Badge>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <h6>Étudiant: {student.first_name} {student.last_name}</h6>
                            <p className="text-muted mb-2">
                                {student.classSeries?.schoolClass?.name} - 
                                {student.classSeries?.schoolClass?.level?.name}
                            </p>
                            <p className="text-muted mb-0">
                                Filière: {student.classSeries?.schoolClass?.speciality_code}
                            </p>
                        </Col>
                        <Col md={6}>
                            {scholarshipAmount > 0 && (
                                <Alert variant="success" className="py-2 mb-2">
                                    <Gift className="me-2" />
                                    <strong>Bourse éligible:</strong> {scholarshipAmount.toLocaleString()} FCFA
                                </Alert>
                            )}
                            {student.classSeries?.schoolClass?.level?.school?.code === 'ISTMS' && (
                                <Alert variant="info" className="py-2">
                                    <ExclamationTriangle className="me-2" />
                                    Pas de frais de rames pour ISTMS
                                </Alert>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Statut des équipements */}
            <Card>
                <Card.Header>
                    <h6 className="mb-0">Statut des Équipements</h6>
                </Card.Header>
                <Card.Body>
                    {Object.keys(equipmentStatus).length === 0 ? (
                        <Alert variant="info">Aucun équipement requis pour cette filière</Alert>
                    ) : (
                        <Table responsive className="mb-0">
                            <thead>
                                <tr>
                                    <th>Équipement</th>
                                    <th>Statut Paiement</th>
                                    <th>Statut Distribution</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(equipmentStatus).map(([type, equipment]) => (
                                    <tr key={type}>
                                        <td>
                                            {getEquipmentIcon(type)}
                                            {getEquipmentLabel(type)}
                                            {equipment.price && (
                                                <small className="d-block text-muted">
                                                    {equipment.price.toLocaleString()} FCFA
                                                </small>
                                            )}
                                        </td>
                                        <td>
                                            {equipment.has_paid_for ? (
                                                <Badge bg="success">Payé</Badge>
                                            ) : (
                                                <Badge bg="danger">Non payé</Badge>
                                            )}
                                            {equipment.paid_date && (
                                                <small className="d-block text-muted">
                                                    {new Date(equipment.paid_date).toLocaleDateString('fr-FR')}
                                                </small>
                                            )}
                                        </td>
                                        <td>
                                            {getStatusBadge(equipment)}
                                            {equipment.received_date && (
                                                <small className="d-block text-muted">
                                                    Reçu le {new Date(equipment.received_date).toLocaleDateString('fr-FR')}
                                                </small>
                                            )}
                                        </td>
                                        <td>
                                            {type === 'rame' && !equipment.brought_physical && !equipment.has_received && (
                                                <Button
                                                    size="sm"
                                                    variant="outline-info"
                                                    onClick={handleMarkRamesAsPhysical}
                                                    className="me-2"
                                                >
                                                    Rames physiques
                                                </Button>
                                            )}
                                            
                                            {equipment.has_paid_for && !equipment.has_received && type !== 'rame' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline-success"
                                                    onClick={() => {
                                                        setSelectedEquipment(type);
                                                        setShowDistributionModal(true);
                                                    }}
                                                >
                                                    <Check2Circle className="me-1" />
                                                    Distribuer
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Récapitulatif des paiements avec impact des équipements */}
            {paymentStatus && (
                <Card>
                    <Card.Header>
                        <h6 className="mb-0">Récapitulatif des Paiements</h6>
                    </Card.Header>
                    <Card.Body>
                        <Table responsive>
                            <thead>
                                <tr>
                                    <th>Tranche</th>
                                    <th>Montant Base</th>
                                    <th>Montant Payé</th>
                                    <th>Bourse</th>
                                    <th>Reste</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentStatus.tranche_status?.map((tranche, index) => {
                                    const scholarshipReduction = tranche.tranche_name.includes('Tranche') ? scholarshipAmount : 0;
                                    const effectiveAmount = Math.max(0, tranche.required_amount - scholarshipReduction);
                                    const remaining = Math.max(0, effectiveAmount - tranche.amount_paid);
                                    
                                    return (
                                        <tr key={index}>
                                            <td>{tranche.tranche_name}</td>
                                            <td>{tranche.required_amount?.toLocaleString()} FCFA</td>
                                            <td>{tranche.amount_paid?.toLocaleString()} FCFA</td>
                                            <td>
                                                {scholarshipReduction > 0 && (
                                                    <Badge bg="success">
                                                        -{scholarshipReduction.toLocaleString()} FCFA
                                                    </Badge>
                                                )}
                                            </td>
                                            <td>{remaining.toLocaleString()} FCFA</td>
                                            <td>
                                                {remaining === 0 ? (
                                                    <Badge bg="success">Soldé</Badge>
                                                ) : (
                                                    <Badge bg="warning">En cours</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>

                        <div className="mt-3">
                            <Row>
                                <Col md={6}>
                                    <strong>Total payé: </strong>
                                    <span className="text-success">
                                        {paymentStatus.total_paid?.toLocaleString()} FCFA
                                    </span>
                                </Col>
                                <Col md={6}>
                                    <strong>Total restant: </strong>
                                    <span className="text-danger">
                                        {Math.max(0, (paymentStatus.total_required || 0) - (scholarshipAmount || 0) - (paymentStatus.total_paid || 0)).toLocaleString()} FCFA
                                    </span>
                                </Col>
                            </Row>
                            {scholarshipAmount > 0 && (
                                <Row className="mt-2">
                                    <Col>
                                        <Alert variant="info" className="py-2 mb-0">
                                            <Gift className="me-2" />
                                            Réduction totale par bourse: <strong>{scholarshipAmount.toLocaleString()} FCFA</strong>
                                        </Alert>
                                    </Col>
                                </Row>
                            )}
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Modal de confirmation de distribution */}
            <Modal show={showDistributionModal} onHide={() => setShowDistributionModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmer la Distribution</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Êtes-vous sûr de vouloir marquer <strong>{getEquipmentLabel(selectedEquipment)}</strong> 
                        comme distribué à <strong>{student.first_name} {student.last_name}</strong> ?
                    </p>
                    <Alert variant="warning">
                        <ExclamationTriangle className="me-2" />
                        Cette action ne peut pas être annulée. Assurez-vous que l'équipement a bien été remis à l'étudiant.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDistributionModal(false)}>
                        Annuler
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={() => handleMarkEquipmentAsReceived(selectedEquipment)}
                    >
                        <Check2Circle className="me-2" />
                        Confirmer la Distribution
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PaymentEquipmentManagement;