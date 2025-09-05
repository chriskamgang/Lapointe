import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Alert, Modal } from 'react-bootstrap';
import { Search, Shift, Laptop, FileEarmarkText, Check2Circle, Clock, ExclamationTriangle, BarChartFill } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';

const EquipmentDistributionPage = () => {
    const [distributions, setDistributions] = useState([]);
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [filters, setFilters] = useState({
        school_id: '',
        equipment_type: '',
        status: ''
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedDistribution, setSelectedDistribution] = useState(null);

    useEffect(() => {
        loadData();
    }, [activeTab, filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'pending') {
                const response = await secureApiEndpoints.equipmentDistribution.getPending(filters);
                setDistributions(response.data?.data || []);
            } else if (activeTab === 'history') {
                const response = await secureApiEndpoints.equipmentDistribution.getHistory(filters);
                setDistributions(response.data?.data || []);
            } else if (activeTab === 'stats') {
                const response = await secureApiEndpoints.equipmentDistribution.getStatistics(filters);
                setStatistics(response.data || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDistribute = async (distributionId, equipmentType) => {
        try {
            const response = await secureApiEndpoints.equipmentDistribution.markAsDistributed({
                student_id: distributionId,
                equipment_type: equipmentType,
                notes: 'Distribution manuelle depuis interface'
            });

            if (response.success) {
                loadData();
                setShowConfirmModal(false);
                alert('Équipement distribué avec succès!');
            } else {
                alert('Erreur: ' + response.message);
            }
        } catch (error) {
            console.error('Erreur distribution:', error);
            alert('Erreur lors de la distribution');
        }
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge bg="warning"><Clock size={14} /> En attente</Badge>;
            case 'distributed':
                return <Badge bg="success"><Check2Circle size={14} /> Distribué</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2 className="mb-3">Distribution des Équipements</h2>
                    <p className="text-muted">
                        Gestion de la distribution des équipements aux étudiants
                    </p>
                </Col>
            </Row>

            {/* Filtres */}
            <Card className="mb-4">
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Type d'équipement</Form.Label>
                                <Form.Select 
                                    value={filters.equipment_type}
                                    onChange={(e) => setFilters({...filters, equipment_type: e.target.value})}
                                >
                                    <option value="">Tous les équipements</option>
                                    <option value="polo">Polo École</option>
                                    <option value="blouse">Blouse Médicale</option>
                                    <option value="laptop">Ordinateur Portable</option>
                                    <option value="rame">Rames de Papier</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>École</Form.Label>
                                <Form.Select 
                                    value={filters.school_id}
                                    onChange={(e) => setFilters({...filters, school_id: e.target.value})}
                                >
                                    <option value="">Toutes les écoles</option>
                                    <option value="1">INSSAS</option>
                                    <option value="2">ESGIT</option>
                                    <option value="3">ESJEC</option>
                                    <option value="4">ESSIT</option>
                                    <option value="5">ISTPM</option>
                                    <option value="6">ISTMS</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Statut</Form.Label>
                                <Form.Select 
                                    value={filters.status}
                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="distributed">Distribué</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Button variant="primary" onClick={() => loadData()} className="w-100">
                                <Search className="me-2" />
                                Filtrer
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Onglets */}
            <div className="mb-4">
                <Button 
                    variant={activeTab === 'pending' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('pending')}
                    className="me-2"
                >
                    <Clock className="me-2" />
                    En Attente
                </Button>
                <Button 
                    variant={activeTab === 'history' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('history')}
                    className="me-2"
                >
                    <Check2Circle className="me-2" />
                    Historique
                </Button>
                <Button 
                    variant={activeTab === 'stats' ? 'primary' : 'outline-primary'}
                    onClick={() => setActiveTab('stats')}
                >
                    <BarChartFill className="me-2" />
                    Statistiques
                </Button>
            </div>

            {/* Contenu selon l'onglet */}
            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                </div>
            ) : activeTab === 'stats' ? (
                <Row>
                    {statistics.map((schoolStats, index) => (
                        <Col lg={6} xl={4} key={index} className="mb-4">
                            <Card className="h-100">
                                <Card.Header>
                                    <h6 className="mb-0">{schoolStats.school?.name}</h6>
                                    <small className="text-muted">{schoolStats.total_students} étudiants</small>
                                </Card.Header>
                                <Card.Body>
                                    {Object.entries(schoolStats.equipment_stats || {}).map(([equipmentType, stats]) => (
                                        stats.required > 0 && (
                                            <div key={equipmentType} className="mb-3">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="d-flex align-items-center">
                                                        {getEquipmentIcon(equipmentType)}
                                                        <span className="ms-2">{getEquipmentLabel(equipmentType)}</span>
                                                    </span>
                                                    <Badge bg="outline-secondary">
                                                        {Math.round((stats.received / stats.required) * 100)}%
                                                    </Badge>
                                                </div>
                                                <div className="progress mb-2" style={{ height: '6px' }}>
                                                    <div 
                                                        className="progress-bar bg-success" 
                                                        style={{ width: `${(stats.received / stats.required) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="row text-sm">
                                                    <div className="col-4">
                                                        <small>Requis: {stats.required}</small>
                                                    </div>
                                                    <div className="col-4">
                                                        <small>Payé: {stats.paid || 0}</small>
                                                    </div>
                                                    <div className="col-4">
                                                        <small>Distribué: {stats.received || 0}</small>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : (
                <Card>
                    <Card.Body className="p-0">
                        <Table responsive>
                            <thead>
                                <tr>
                                    <th>Étudiant</th>
                                    <th>École/Classe</th>
                                    <th>Équipement</th>
                                    <th>Date paiement</th>
                                    {activeTab === 'history' && <th>Date distribution</th>}
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {distributions.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeTab === 'history' ? 7 : 6} className="text-center py-4">
                                            <Alert variant="info" className="mb-0">
                                                {activeTab === 'pending' 
                                                    ? 'Aucune distribution en attente'
                                                    : 'Aucun historique trouvé'
                                                }
                                            </Alert>
                                        </td>
                                    </tr>
                                ) : (
                                    distributions.map((distribution, index) => (
                                        <tr key={index}>
                                            <td>
                                                <strong>
                                                    {distribution.student?.first_name} {distribution.student?.last_name}
                                                </strong>
                                                <br />
                                                <small className="text-muted">
                                                    ID: {distribution.student?.student_id}
                                                </small>
                                            </td>
                                            <td>
                                                <Badge bg="primary" className="mb-1">
                                                    {distribution.student?.classSeries?.schoolClass?.level?.school?.code}
                                                </Badge>
                                                <br />
                                                <small>
                                                    {distribution.student?.classSeries?.schoolClass?.name}
                                                </small>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    {getEquipmentIcon(distribution.equipment_type)}
                                                    <span className="ms-2">
                                                        {getEquipmentLabel(distribution.equipment_type)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                {distribution.paid_date ? 
                                                    new Date(distribution.paid_date).toLocaleDateString('fr-FR') : 
                                                    '-'
                                                }
                                            </td>
                                            {activeTab === 'history' && (
                                                <td>
                                                    {distribution.received_date ? 
                                                        new Date(distribution.received_date).toLocaleDateString('fr-FR') : 
                                                        '-'
                                                    }
                                                </td>
                                            )}
                                            <td>
                                                {getStatusBadge(
                                                    distribution.has_received ? 'distributed' : 
                                                    distribution.has_paid_for ? 'pending' : 'unpaid'
                                                )}
                                            </td>
                                            <td>
                                                {activeTab === 'pending' && distribution.has_paid_for && !distribution.has_received && (
                                                    <Button
                                                        size="sm"
                                                        variant="success"
                                                        onClick={() => {
                                                            setSelectedDistribution(distribution);
                                                            setShowConfirmModal(true);
                                                        }}
                                                    >
                                                        <Check2Circle className="me-1" />
                                                        Distribuer
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Modal de confirmation */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmer la distribution</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDistribution && (
                        <div>
                            <p>
                                Confirmer la distribution de <strong>{getEquipmentLabel(selectedDistribution.equipment_type)}</strong> à :
                            </p>
                            <div className="bg-light p-3 rounded">
                                <strong>{selectedDistribution.student?.first_name} {selectedDistribution.student?.last_name}</strong><br />
                                <small>
                                    {selectedDistribution.student?.classSeries?.schoolClass?.name} - 
                                    {selectedDistribution.student?.classSeries?.schoolClass?.level?.school?.name}
                                </small>
                            </div>
                            <Alert variant="warning" className="mt-3">
                                <ExclamationTriangle className="me-2" />
                                Cette action est irréversible. Assurez-vous que l'équipement a bien été remis à l'étudiant.
                            </Alert>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Annuler
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={() => handleDistribute(
                            selectedDistribution?.student?.id,
                            selectedDistribution?.equipment_type
                        )}
                    >
                        <Check2Circle className="me-2" />
                        Confirmer la distribution
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default EquipmentDistributionPage;