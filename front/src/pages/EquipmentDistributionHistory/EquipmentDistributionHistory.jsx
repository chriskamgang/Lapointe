import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Table, Form, Button, Modal, Alert, Tabs, Tab } from 'react-bootstrap';
import { 
    Search, Filter, Download, Eye, Shift, Laptop, FileEarmarkText, 
    PieChart, BarChart, TrainFront, People, Gift, Calendar, Building 
} from 'react-bootstrap-icons';

const EquipmentDistributionHistory = () => {
    const [activeTab, setActiveTab] = useState('statistics');
    const [distributions, setDistributions] = useState([]);
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        school_id: '',
        equipment_type: '',
        status: '',
        date_range: ''
    });
    const [schools, setSchools] = useState([]);
    const [selectedDistribution, setSelectedDistribution] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            loadDistributionHistory();
        } else if (activeTab === 'statistics') {
            loadStatistics();
        }
    }, [activeTab, filters]);

    const loadInitialData = async () => {
        try {
            const schoolsResponse = await fetch('/api/schools');
            const schoolsData = await schoolsResponse.json();
            if (schoolsData.success) {
                setSchools(schoolsData.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement initial:', error);
        }
    };

    const loadDistributionHistory = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/equipment-distribution/history?${queryParams}`);
            const data = await response.json();
            
            if (data.success) {
                setDistributions(data.data.data || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'historique:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/equipment-distribution/statistics?${queryParams}`);
            const data = await response.json();
            
            if (data.success) {
                setStatistics(data.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEquipmentIcon = (type) => {
        const icons = {
            'polo': <Shift className="text-primary" />,
            'blouse': <Shift className="text-success" />,
            'laptop': <Laptop className="text-info" />,
            'rame': <FileEarmarkText className="text-warning" />
        };
        return icons[type] || <Gift className="text-secondary" />;
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
        if (equipment.brought_physical) {
            return <Badge bg="info">Rames physiques</Badge>;
        }
        if (equipment.has_received) {
            return <Badge bg="success">Distribué</Badge>;
        }
        if (equipment.has_paid_for) {
            return <Badge bg="warning">En attente</Badge>;
        }
        return <Badge bg="danger">Non payé</Badge>;
    };

    const calculateCompletionRate = (stats) => {
        if (!stats.required || stats.required === 0) return 0;
        return Math.round((stats.received / stats.required) * 100);
    };

    const exportStatistics = async () => {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/equipment-distribution/export?${queryParams}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `distribution_equipements_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            alert('Erreur lors de l\'export');
        }
    };

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="mb-1">Distribution des Équipements</h2>
                            <p className="text-muted mb-0">
                                Suivi et historique de la distribution des polos, blouses et ordinateurs portables
                            </p>
                        </div>
                        <Button variant="outline-success" onClick={exportStatistics}>
                            <Download className="me-2" />
                            Exporter
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Filtres */}
            <Card className="mb-4">
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>École</Form.Label>
                                <Form.Select 
                                    value={filters.school_id} 
                                    onChange={(e) => setFilters({...filters, school_id: e.target.value})}
                                >
                                    <option value="">Toutes les écoles</option>
                                    {schools.map(school => (
                                        <option key={school.id} value={school.id}>
                                            {school.name} ({school.code})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
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
                                <Form.Label>Statut</Form.Label>
                                <Form.Select 
                                    value={filters.status} 
                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="distributed">Distribué</option>
                                    <option value="physical">Rames physiques</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Période</Form.Label>
                                <Form.Select 
                                    value={filters.date_range} 
                                    onChange={(e) => setFilters({...filters, date_range: e.target.value})}
                                >
                                    <option value="">Toute période</option>
                                    <option value="today">Aujourd'hui</option>
                                    <option value="week">Cette semaine</option>
                                    <option value="month">Ce mois</option>
                                    <option value="year">Cette année</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Onglets principaux */}
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                <Tab eventKey="statistics" title={<><PieChart className="me-2" />Statistiques</>}>
                    {/* Vue Statistiques */}
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                    ) : (
                        <Row>
                            {statistics.map((schoolStats, index) => (
                                <Col key={index} lg={6} xl={4} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Header className="d-flex justify-content-between align-items-center">
                                            <h6 className="mb-0">
                                                <Building className="me-2" />
                                                {schoolStats.school.name}
                                            </h6>
                                            <Badge bg="secondary">{schoolStats.school.code}</Badge>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span><People className="me-2" />Étudiants total</span>
                                                    <Badge bg="primary" className="fs-6">
                                                        {schoolStats.total_students}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="equipment-stats">
                                                {Object.entries(schoolStats.equipment_stats).map(([equipmentType, stats]) => (
                                                    stats.required > 0 && (
                                                        <div key={equipmentType} className="mb-3">
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span>
                                                                    {getEquipmentIcon(equipmentType)}
                                                                    <span className="ms-1">{getEquipmentLabel(equipmentType)}</span>
                                                                </span>
                                                                <Badge bg="outline-secondary">
                                                                    {calculateCompletionRate(stats)}%
                                                                </Badge>
                                                            </div>
                                                            
                                                            <div className="progress mb-1" style={{ height: '6px' }}>
                                                                <div 
                                                                    className="progress-bar bg-success" 
                                                                    style={{ width: `${calculateCompletionRate(stats)}%` }}
                                                                ></div>
                                                            </div>
                                                            
                                                            <div className="row text-sm text-muted">
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
                                                            
                                                            {equipmentType === 'rame' && stats.physical > 0 && (
                                                                <div className="text-center mt-1">
                                                                    <Badge bg="info" className="small">
                                                                        {stats.physical} rames physiques
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                ))}
                                            </div>

                                            {/* Alertes si nécessaire */}
                                            {schoolStats.equipment_stats.laptop?.required > 0 && 
                                             schoolStats.equipment_stats.laptop?.received < schoolStats.equipment_stats.laptop?.required && (
                                                <Alert variant="warning" className="py-2 small">
                                                    <TrainFront className="me-2" />
                                                    {schoolStats.equipment_stats.laptop.required - (schoolStats.equipment_stats.laptop.received || 0)} ordinateurs en attente
                                                </Alert>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Tab>

                <Tab eventKey="history" title={<><Calendar className="me-2" />Historique</>}>
                    {/* Vue Historique */}
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                    ) : (
                        <Card>
                            <Card.Header>
                                <Row className="align-items-center">
                                    <Col>
                                        <h6 className="mb-0">Historique des Distributions</h6>
                                    </Col>
                                    <Col xs="auto">
                                        <Badge bg="secondary">
                                            {distributions.length} entrée{distributions.length > 1 ? 's' : ''}
                                        </Badge>
                                    </Col>
                                </Row>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {distributions.length === 0 ? (
                                    <div className="text-center py-4">
                                        <Alert variant="info" className="mx-4">
                                            Aucune distribution trouvée avec les filtres actuels
                                        </Alert>
                                    </div>
                                ) : (
                                    <Table responsive className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Étudiant</th>
                                                <th>École/Filière</th>
                                                <th>Équipement</th>
                                                <th>Date Paiement</th>
                                                <th>Date Distribution</th>
                                                <th>Statut</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {distributions.map((distribution, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <div>
                                                            <strong>
                                                                {distribution.student?.first_name} {distribution.student?.last_name}
                                                            </strong>
                                                            <div className="text-muted small">
                                                                ID: {distribution.student?.student_id}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <Badge bg="primary" className="mb-1">
                                                                {distribution.student?.classSeries?.schoolClass?.level?.school?.code}
                                                            </Badge>
                                                            <div className="small text-muted">
                                                                {distribution.student?.classSeries?.schoolClass?.name}
                                                            </div>
                                                            <div className="small text-muted">
                                                                {distribution.student?.classSeries?.schoolClass?.level?.name}
                                                            </div>
                                                        </div>
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
                                                        {distribution.paid_date ? (
                                                            <div>
                                                                <div>{new Date(distribution.paid_date).toLocaleDateString('fr-FR')}</div>
                                                                <div className="text-muted small">
                                                                    {new Date(distribution.paid_date).toLocaleTimeString('fr-FR', { 
                                                                        hour: '2-digit', 
                                                                        minute: '2-digit' 
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Badge bg="danger">Non payé</Badge>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {distribution.received_date ? (
                                                            <div>
                                                                <div>{new Date(distribution.received_date).toLocaleDateString('fr-FR')}</div>
                                                                <div className="text-muted small">
                                                                    {new Date(distribution.received_date).toLocaleTimeString('fr-FR', { 
                                                                        hour: '2-digit', 
                                                                        minute: '2-digit' 
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {getStatusBadge(distribution)}
                                                    </td>
                                                    <td>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-primary"
                                                            onClick={() => {
                                                                setSelectedDistribution(distribution);
                                                                setShowDetailsModal(true);
                                                            }}
                                                        >
                                                            <Eye size={14} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    )}
                </Tab>

                <Tab eventKey="pending" title={<><TrainFront className="me-2" />En Attente</>}>
                    {/* Vue des distributions en attente */}
                    <PendingDistributions filters={filters} />
                </Tab>
            </Tabs>

            {/* Modal de détails */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Détails de la Distribution</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDistribution && (
                        <div>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <h6>Informations de l'étudiant</h6>
                                    <p><strong>Nom:</strong> {selectedDistribution.student?.first_name} {selectedDistribution.student?.last_name}</p>
                                    <p><strong>ID Étudiant:</strong> {selectedDistribution.student?.student_id}</p>
                                    <p><strong>Email:</strong> {selectedDistribution.student?.email || 'Non renseigné'}</p>
                                </Col>
                                <Col md={6}>
                                    <h6>Informations académiques</h6>
                                    <p><strong>École:</strong> {selectedDistribution.student?.classSeries?.schoolClass?.level?.school?.name}</p>
                                    <p><strong>Classe:</strong> {selectedDistribution.student?.classSeries?.schoolClass?.name}</p>
                                    <p><strong>Niveau:</strong> {selectedDistribution.student?.classSeries?.schoolClass?.level?.name}</p>
                                </Col>
                            </Row>

                            <hr />

                            <Row className="mb-3">
                                <Col md={6}>
                                    <h6>Détails de l'équipement</h6>
                                    <p>
                                        <strong>Type:</strong> 
                                        <span className="ms-2">
                                            {getEquipmentIcon(selectedDistribution.equipment_type)}
                                            {getEquipmentLabel(selectedDistribution.equipment_type)}
                                        </span>
                                    </p>
                                    <p><strong>Statut:</strong> {getStatusBadge(selectedDistribution)}</p>
                                </Col>
                                <Col md={6}>
                                    <h6>Chronologie</h6>
                                    {selectedDistribution.paid_date && (
                                        <p><strong>Date de paiement:</strong> {new Date(selectedDistribution.paid_date).toLocaleString('fr-FR')}</p>
                                    )}
                                    {selectedDistribution.received_date && (
                                        <p><strong>Date de réception:</strong> {new Date(selectedDistribution.received_date).toLocaleString('fr-FR')}</p>
                                    )}
                                    <p><strong>Créé le:</strong> {new Date(selectedDistribution.created_at).toLocaleString('fr-FR')}</p>
                                </Col>
                            </Row>

                            {selectedDistribution.notes && (
                                <div>
                                    <h6>Notes</h6>
                                    <div className="bg-light p-3 rounded">
                                        <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                                            {selectedDistribution.notes}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                        Fermer
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

// Composant pour les distributions en attente
const PendingDistributions = ({ filters }) => {
    const [pendingDistributions, setPendingDistributions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPendingDistributions();
    }, [filters]);

    const loadPendingDistributions = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/equipment-distribution/pending?${queryParams}`);
            const data = await response.json();
            
            if (data.success) {
                setPendingDistributions(data.data.data || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des distributions en attente:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsDistributed = async (distributionId, equipmentType) => {
        try {
            const response = await fetch('/api/equipment-distribution/mark-as-distributed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_id: distributionId,
                    equipment_type: equipmentType,
                    notes: 'Distribution depuis la page historique'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                loadPendingDistributions();
                alert('Équipement marqué comme distribué avec succès');
            } else {
                alert('Erreur: ' + result.message);
            }
        } catch (error) {
            console.error('Erreur lors de la distribution:', error);
            alert('Erreur lors de la distribution de l\'équipement');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </div>
            </div>
        );
    }

    return (
        <Card>
            <Card.Header>
                <Row className="align-items-center">
                    <Col>
                        <h6 className="mb-0">Distributions en Attente</h6>
                        <small className="text-muted">Étudiants ayant payé mais n'ayant pas encore reçu leur équipement</small>
                    </Col>
                    <Col xs="auto">
                        <Badge bg="warning">
                            {pendingDistributions.length} en attente
                        </Badge>
                    </Col>
                </Row>
            </Card.Header>
            <Card.Body className="p-0">
                {pendingDistributions.length === 0 ? (
                    <div className="text-center py-4">
                        <Alert variant="success" className="mx-4">
                            Aucune distribution en attente ! Tous les équipements payés ont été distribués.
                        </Alert>
                    </div>
                ) : (
                    <Table responsive className="mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Étudiant</th>
                                <th>École/Filière</th>
                                <th>Équipement</th>
                                <th>Date Paiement</th>
                                <th>Délai d'attente</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingDistributions.map((distribution, index) => {
                                const daysPending = Math.floor(
                                    (new Date() - new Date(distribution.paid_date)) / (1000 * 60 * 60 * 24)
                                );
                                
                                return (
                                    <tr key={index} className={daysPending > 7 ? 'table-warning' : ''}>
                                        <td>
                                            <div>
                                                <strong>
                                                    {distribution.student?.first_name} {distribution.student?.last_name}
                                                </strong>
                                                <div className="text-muted small">
                                                    ID: {distribution.student?.student_id}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <Badge bg="primary" className="mb-1">
                                                    {distribution.student?.classSeries?.schoolClass?.level?.school?.code}
                                                </Badge>
                                                <div className="small text-muted">
                                                    {distribution.student?.classSeries?.schoolClass?.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                {/* Réutiliser les fonctions d'icônes du composant parent */}
                                                <Shift className={distribution.equipment_type === 'polo' ? 'text-primary' : 'text-success'} />
                                                <span className="ms-2">
                                                    {distribution.equipment_type === 'polo' ? 'Polo École' :
                                                     distribution.equipment_type === 'blouse' ? 'Blouse Médicale' :
                                                     distribution.equipment_type === 'laptop' ? 'Ordinateur Portable' :
                                                     'Rames de Papier'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                {new Date(distribution.paid_date).toLocaleDateString('fr-FR')}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={daysPending > 7 ? 'text-danger fw-bold' : daysPending > 3 ? 'text-warning' : 'text-success'}>
                                                {daysPending} jour{daysPending > 1 ? 's' : ''}
                                            </div>
                                            {daysPending > 7 && (
                                                <small className="text-danger">Urgent!</small>
                                            )}
                                        </td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant="success"
                                                onClick={() => handleMarkAsDistributed(
                                                    distribution.student.id,
                                                    distribution.equipment_type
                                                )}
                                            >
                                                Distribuer
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Card.Body>
        </Card>
    );
};

export default EquipmentDistributionHistory;