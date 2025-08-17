import { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Table,
    Badge,
    Modal,
    Form,
    Alert,
    Spinner,
    Pagination,
    ButtonGroup,
    OverlayTrigger,
    Tooltip
} from 'react-bootstrap';
import {
    Eye,
    Check2Circle,
    XCircle,
    Clock,
    Calendar,
    CurrencyDollar,
    Person,
    FileText,
    BarChart,
    Search,
    Whatsapp,
    Download,
    FiletypePdf,
    FiletypeDocx,
    FileEarmarkExcel
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { extractErrorMessage } from '../../utils/errorHandler';
import Swal from 'sweetalert2';

const NeedsManagement = () => {
    const [needs, setNeeds] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedNeed, setSelectedNeed] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        from_date: '',
        to_date: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadNeeds();
        loadStatistics();
    }, [currentPage, filters]);

    const loadNeeds = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                per_page: 15,
                ...filters
            };

            // Nettoyer les paramètres vides
            Object.keys(params).forEach(key => {
                if (params[key] === '') {
                    delete params[key];
                }
            });

            const response = await secureApiEndpoints.needs.getAll(params);
            
            if (response.success) {
                setNeeds(response.data.data);
                setCurrentPage(response.data.current_page);
                setTotalPages(response.data.last_page);
            } else {
                setError(response.message);
            }
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const response = await secureApiEndpoints.needs.getStatistics();
            if (response.success) {
                setStatistics(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    };

    const showNeedDetails = async (need) => {
        try {
            const response = await secureApiEndpoints.needs.getById(need.id);
            if (response.success) {
                setSelectedNeed(response.data);
                setShowModal(true);
            }
        } catch (error) {
            setError(extractErrorMessage(error));
        }
    };

    const approveNeed = async (needId) => {
        const result = await Swal.fire({
            title: 'Approuver ce besoin ?',
            text: 'Cette action enverra une notification au demandeur.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Oui, approuver',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#28a745'
        });

        if (result.isConfirmed) {
            try {
                setProcessing(true);
                const response = await secureApiEndpoints.needs.approve(needId);
                
                if (response.success) {
                    setSuccess('Besoin approuvé avec succès');
                    loadNeeds();
                    loadStatistics();
                    setShowModal(false);
                } else {
                    setError(response.message);
                }
            } catch (error) {
                setError(extractErrorMessage(error));
            } finally {
                setProcessing(false);
            }
        }
    };

    const handleReject = (need) => {
        setSelectedNeed(need);
        setRejectionReason('');
        setShowRejectModal(true);
    };

    const rejectNeed = async () => {
        if (!rejectionReason.trim()) {
            setError('Le motif du rejet est obligatoire');
            return;
        }

        try {
            setProcessing(true);
            const response = await secureApiEndpoints.needs.reject(selectedNeed.id, {
                rejection_reason: rejectionReason
            });
            
            if (response.success) {
                setSuccess('Besoin rejeté avec succès');
                loadNeeds();
                loadStatistics();
                setShowRejectModal(false);
                setShowModal(false);
            } else {
                setError(response.message);
            }
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setProcessing(false);
        }
    };

    const testWhatsApp = async () => {
        try {
            setProcessing(true);
            const response = await secureApiEndpoints.needs.testWhatsApp();
            
            if (response.success) {
                Swal.fire({
                    title: 'Test réussi !',
                    text: response.message,
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire({
                    title: 'Test échoué',
                    text: response.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Erreur',
                text: extractErrorMessage(error),
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { variant: 'warning', icon: Clock, text: 'En attente' },
            approved: { variant: 'success', icon: Check2Circle, text: 'Approuvé' },
            rejected: { variant: 'danger', icon: XCircle, text: 'Rejeté' }
        };

        const config = statusConfig[status] || statusConfig.pending;
        const IconComponent = config.icon;

        return (
            <Badge bg={config.variant} className="d-flex align-items-center gap-1">
                <IconComponent size={12} />
                {config.text}
            </Badge>
        );
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('XAF', 'FCFA');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportNeeds = async (format) => {
        try {
            setProcessing(true);
            
            // Préparer les paramètres d'export avec les filtres actuels
            const exportParams = { ...filters };
            
            // Nettoyer les paramètres vides
            Object.keys(exportParams).forEach(key => {
                if (exportParams[key] === '') {
                    delete exportParams[key];
                }
            });

            let url = '';
            let filename = '';
            const statusSuffix = filters.status ? `_${filters.status}` : '_tous';
            const dateSuffix = new Date().toISOString().split('T')[0];

            switch (format) {
                case 'pdf':
                    url = secureApiEndpoints.needs.exportPdf(exportParams);
                    filename = `besoins${statusSuffix}_${dateSuffix}.pdf`;
                    break;
                case 'excel':
                    url = secureApiEndpoints.needs.exportExcel(exportParams);
                    filename = `besoins${statusSuffix}_${dateSuffix}.xlsx`;
                    break;
                case 'word':
                    url = secureApiEndpoints.needs.exportWord(exportParams);
                    filename = `besoins${statusSuffix}_${dateSuffix}.docx`;
                    break;
                default:
                    throw new Error('Format d\'export non supporté');
            }

            // Créer un lien temporaire pour télécharger le fichier
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setSuccess(`Export ${format.toUpperCase()} lancé avec succès`);
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>Gestion des Besoins</h2>
                            <p className="text-muted">Gérez les demandes de besoins des utilisateurs</p>
                        </div>
                        <Button
                            variant="outline-success"
                            onClick={testWhatsApp}
                            disabled={processing}
                        >
                            <Whatsapp className="me-2" />
                            Tester WhatsApp
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Alerts */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            {/* Statistics */}
            {statistics.summary && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="bg-primary text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>Total</h5>
                                        <h3>{statistics.summary.total}</h3>
                                    </div>
                                    <BarChart size={40} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-warning text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>En attente</h5>
                                        <h3>{statistics.summary.pending}</h3>
                                        <small>{formatAmount(statistics.summary.total_amount_pending)}</small>
                                    </div>
                                    <Clock size={40} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-success text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>Approuvés</h5>
                                        <h3>{statistics.summary.approved}</h3>
                                        <small>{formatAmount(statistics.summary.total_amount_approved)}</small>
                                    </div>
                                    <Check2Circle size={40} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-danger text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <h5>Rejetés</h5>
                                        <h3>{statistics.summary.rejected}</h3>
                                        <small>{formatAmount(statistics.summary.total_amount_rejected)}</small>
                                    </div>
                                    <XCircle size={40} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Filters */}
            <Card className="mb-4">
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Statut</Form.Label>
                                <Form.Select
                                    value={filters.status}
                                    onChange={(e) => {
                                        setFilters({ ...filters, status: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="approved">Approuvé</option>
                                    <option value="rejected">Rejeté</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Recherche</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nom ou description..."
                                    value={filters.search}
                                    onChange={(e) => {
                                        setFilters({ ...filters, search: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>Date de début</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filters.from_date}
                                    onChange={(e) => {
                                        setFilters({ ...filters, from_date: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label>Date de fin</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filters.to_date}
                                    onChange={(e) => {
                                        setFilters({ ...filters, to_date: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Actions d'Export</Form.Label>
                                <div className="d-grid gap-2">
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip>Exporter la liste en PDF</Tooltip>}
                                    >
                                        <Button
                                            variant="danger"
                                            size="md"
                                            onClick={() => exportNeeds('pdf')}
                                            disabled={processing}
                                            className="d-flex align-items-center justify-content-center py-2"
                                        >
                                            <FiletypePdf size={18} className="me-2" />
                                            <strong>PDF</strong>
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip>Exporter la liste en Excel</Tooltip>}
                                    >
                                        <Button
                                            variant="success"
                                            size="md"
                                            onClick={() => exportNeeds('excel')}
                                            disabled={processing}
                                            className="d-flex align-items-center justify-content-center py-2"
                                        >
                                            <FileEarmarkExcel size={18} className="me-2" />
                                            <strong>Excel</strong>
                                        </Button>
                                    </OverlayTrigger>
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip>Exporter la liste en Word</Tooltip>}
                                    >
                                        <Button
                                            variant="primary"
                                            size="md"
                                            onClick={() => exportNeeds('word')}
                                            disabled={processing}
                                            className="d-flex align-items-center justify-content-center py-2"
                                        >
                                            <FiletypeDocx size={18} className="me-2" />
                                            <strong>Word</strong>
                                        </Button>
                                    </OverlayTrigger>
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Table */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">Liste des besoins ({statistics.summary?.total || 0})</h5>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </Spinner>
                        </div>
                    ) : needs.length === 0 ? (
                        <div className="text-center py-4">
                            <FileText size={48} className="text-muted mb-3" />
                            <p className="text-muted">Aucun besoin trouvé</p>
                        </div>
                    ) : (
                        <>
                            <Table responsive hover>
                                <thead>
                                    <tr>
                                        <th>Demandeur</th>
                                        <th>Besoin</th>
                                        <th>Montant</th>
                                        <th>Statut</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {needs.map((need) => (
                                        <tr key={need.id}>
                                            <td>
                                                <div>
                                                    <Person className="me-1" />
                                                    <strong>{need.user.name}</strong>
                                                    <div className="text-muted small">
                                                        {need.user.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <strong>{need.name}</strong>
                                                    <div className="text-muted small">
                                                        {need.description.length > 80
                                                            ? `${need.description.substring(0, 80)}...`
                                                            : need.description
                                                        }
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <strong className="text-primary">
                                                    {formatAmount(need.amount)}
                                                </strong>
                                            </td>
                                            <td>{getStatusBadge(need.status)}</td>
                                            <td>
                                                <small className="text-muted">
                                                    {formatDate(need.created_at)}
                                                </small>
                                            </td>
                                            <td>
                                                <ButtonGroup size="sm">
                                                    <OverlayTrigger
                                                        overlay={<Tooltip>Voir les détails</Tooltip>}
                                                    >
                                                        <Button
                                                            variant="outline-primary"
                                                            onClick={() => showNeedDetails(need)}
                                                        >
                                                            <Eye size={14} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    
                                                    {need.status === 'pending' && (
                                                        <>
                                                            <OverlayTrigger
                                                                overlay={<Tooltip>Approuver</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="outline-success"
                                                                    onClick={() => approveNeed(need.id)}
                                                                    disabled={processing}
                                                                >
                                                                    <Check2Circle size={14} />
                                                                </Button>
                                                            </OverlayTrigger>
                                                            
                                                            <OverlayTrigger
                                                                overlay={<Tooltip>Rejeter</Tooltip>}
                                                            >
                                                                <Button
                                                                    variant="outline-danger"
                                                                    onClick={() => handleReject(need)}
                                                                    disabled={processing}
                                                                >
                                                                    <XCircle size={14} />
                                                                </Button>
                                                            </OverlayTrigger>
                                                        </>
                                                    )}
                                                </ButtonGroup>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center">
                                    <Pagination>
                                        <Pagination.Prev
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                        />
                                        {[...Array(totalPages)].map((_, index) => (
                                            <Pagination.Item
                                                key={index + 1}
                                                active={index + 1 === currentPage}
                                                onClick={() => setCurrentPage(index + 1)}
                                            >
                                                {index + 1}
                                            </Pagination.Item>
                                        ))}
                                        <Pagination.Next
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                        />
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Modal pour détails */}
            <Modal
                show={showModal}
                onHide={() => setShowModal(false)}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Détails du Besoin</Modal.Title>
                </Modal.Header>
                
                <Modal.Body>
                    {selectedNeed && (
                        <div>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <strong>Demandeur:</strong>
                                    <p><Person className="me-1" />{selectedNeed.user.name}</p>
                                    <small className="text-muted">{selectedNeed.user.email}</small>
                                </Col>
                                <Col md={6}>
                                    <strong>Statut:</strong>
                                    <p>{getStatusBadge(selectedNeed.status)}</p>
                                </Col>
                            </Row>
                            
                            <Row className="mb-3">
                                <Col md={6}>
                                    <strong>Nom du besoin:</strong>
                                    <p>{selectedNeed.name}</p>
                                </Col>
                                <Col md={6}>
                                    <strong>Montant:</strong>
                                    <p className="text-primary">{formatAmount(selectedNeed.amount)}</p>
                                </Col>
                            </Row>
                            
                            <Row className="mb-3">
                                <Col>
                                    <strong>Description:</strong>
                                    <p>{selectedNeed.description}</p>
                                </Col>
                            </Row>
                            
                            <Row className="mb-3">
                                <Col md={6}>
                                    <strong>Date de soumission:</strong>
                                    <p><Calendar className="me-1" />{formatDate(selectedNeed.created_at)}</p>
                                </Col>
                                {selectedNeed.approved_by && (
                                    <Col md={6}>
                                        <strong>Traité par:</strong>
                                        <p><Person className="me-1" />{selectedNeed.approved_by.name}</p>
                                        <small className="text-muted">
                                            Le {formatDate(selectedNeed.approved_at)}
                                        </small>
                                    </Col>
                                )}
                            </Row>

                            {selectedNeed.rejection_reason && (
                                <div className="mb-3">
                                    <strong>Motif du rejet:</strong>
                                    <div className="alert alert-danger">
                                        {selectedNeed.rejection_reason}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Fermer
                    </Button>
                    {selectedNeed && selectedNeed.status === 'pending' && (
                        <>
                            <Button
                                variant="success"
                                onClick={() => approveNeed(selectedNeed.id)}
                                disabled={processing}
                            >
                                <Check2Circle className="me-2" />
                                Approuver
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => handleReject(selectedNeed)}
                                disabled={processing}
                            >
                                <XCircle className="me-2" />
                                Rejeter
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Modal pour rejet */}
            <Modal
                show={showRejectModal}
                onHide={() => setShowRejectModal(false)}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Rejeter le Besoin</Modal.Title>
                </Modal.Header>
                
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Motif du rejet *</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder="Expliquez pourquoi ce besoin ne peut pas être approuvé..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            required
                        />
                        <Form.Text className="text-muted">
                            Ce motif sera communiqué au demandeur via WhatsApp.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                        Annuler
                    </Button>
                    <Button
                        variant="danger"
                        onClick={rejectNeed}
                        disabled={processing || !rejectionReason.trim()}
                    >
                        {processing ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Rejet...
                            </>
                        ) : (
                            <>
                                <XCircle className="me-2" />
                                Confirmer le Rejet
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default NeedsManagement;