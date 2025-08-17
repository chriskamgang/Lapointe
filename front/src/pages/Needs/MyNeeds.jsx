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
    Pagination
} from 'react-bootstrap';
import {
    Plus,
    Eye,
    Calendar,
    CurrencyDollar,
    Person,
    FileText,
    Check2Circle,
    XCircle,
    Clock,
    PencilSquare,
    Trash3
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { extractErrorMessage } from '../../utils/errorHandler';
import Swal from 'sweetalert2';

const MyNeeds = () => {
    const [needs, setNeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedNeed, setSelectedNeed] = useState(null);
    const [editingNeed, setEditingNeed] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        amount: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadNeeds();
    }, [currentPage, filters]);

    const loadNeeds = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                per_page: 10
            };

            // N'ajouter le filtre status que s'il n'est pas vide
            if (filters.status && filters.status.trim() !== '') {
                params.status = filters.status;
            }

            const response = await secureApiEndpoints.needs.getMyNeeds(params);
            
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setSaving(true);
            setError('');
            setSuccess('');

            let response;
            if (editingNeed) {
                // Mode modification
                response = await secureApiEndpoints.needs.update(editingNeed.id, formData);
            } else {
                // Mode création
                response = await secureApiEndpoints.needs.create(formData);
            }
            
            if (response.success) {
                const message = editingNeed ? 'Besoin modifié avec succès' : 'Besoin soumis avec succès';
                setSuccess(message);
                setShowModal(false);
                setFormData({ name: '', description: '', amount: '' });
                setEditingNeed(null);
                loadNeeds();
                
                Swal.fire({
                    title: 'Succès !',
                    text: editingNeed 
                        ? 'Votre besoin a été modifié avec succès.' 
                        : 'Votre besoin a été soumis avec succès. Vous recevrez une notification une fois qu\'il aura été traité.',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            } else {
                setError(response.message);
            }
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const showNeedDetails = async (need) => {
        try {
            const response = await secureApiEndpoints.needs.getById(need.id);
            if (response.success) {
                setSelectedNeed(response.data);
                setEditingNeed(null);
                setShowModal(true);
            }
        } catch (error) {
            setError(extractErrorMessage(error));
        }
    };

    const editNeed = (need) => {
        setEditingNeed(need);
        setSelectedNeed(null);
        setFormData({
            name: need.name,
            description: need.description,
            amount: need.amount
        });
        setShowModal(true);
    };

    const deleteNeed = async (need) => {
        const result = await Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: 'Cette action supprimera définitivement ce besoin. Cette action est irréversible !',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                setError('');
                const response = await secureApiEndpoints.needs.delete(need.id);
                
                if (response.success) {
                    setSuccess('Besoin supprimé avec succès');
                    loadNeeds();
                    
                    Swal.fire({
                        title: 'Supprimé !',
                        text: 'Le besoin a été supprimé avec succès.',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });
                } else {
                    setError(response.message);
                }
            } catch (error) {
                setError(extractErrorMessage(error));
                
                Swal.fire({
                    title: 'Erreur !',
                    text: 'Une erreur est survenue lors de la suppression.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
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

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>Mes Besoins</h2>
                            <p className="text-muted">Gérez vos demandes de besoins</p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setSelectedNeed(null);
                                setEditingNeed(null);
                                setFormData({ name: '', description: '', amount: '' });
                                setShowModal(true);
                            }}
                        >
                            <Plus className="me-2" />
                            Nouveau Besoin
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
                    </Row>
                </Card.Body>
            </Card>

            {/* Table */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">Liste de mes besoins</h5>
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
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setSelectedNeed(null);
                                    setEditingNeed(null);
                                    setFormData({ name: '', description: '', amount: '' });
                                    setShowModal(true);
                                }}
                            >
                                <Plus className="me-2" />
                                Soumettre votre premier besoin
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Table responsive hover>
                                <thead>
                                    <tr>
                                        <th>Besoin</th>
                                        <th>Montant</th>
                                        <th>Statut</th>
                                        <th>Date de soumission</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {needs.map((need) => (
                                        <tr key={need.id}>
                                            <td>
                                                <div>
                                                    <strong>{need.name}</strong>
                                                    <div className="text-muted small">
                                                        {need.description.length > 100
                                                            ? `${need.description.substring(0, 100)}...`
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
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => showNeedDetails(need)}
                                                    >
                                                        <Eye size={14} className="me-1" />
                                                        Voir
                                                    </Button>
                                                    
                                                    {need.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                variant="outline-warning"
                                                                size="sm"
                                                                onClick={() => editNeed(need)}
                                                                title="Modifier ce besoin"
                                                            >
                                                                <PencilSquare size={14} />
                                                            </Button>
                                                            
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => deleteNeed(need)}
                                                                title="Supprimer ce besoin"
                                                            >
                                                                <Trash3 size={14} />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
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

            {/* Modal pour création/détails */}
            <Modal
                show={showModal}
                onHide={() => {
                    setShowModal(false);
                    setEditingNeed(null);
                    setSelectedNeed(null);
                    setFormData({ name: '', description: '', amount: '' });
                }}
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        {selectedNeed 
                            ? 'Détails du Besoin' 
                            : editingNeed 
                                ? 'Modifier le Besoin' 
                                : 'Nouveau Besoin'
                        }
                    </Modal.Title>
                </Modal.Header>
                
                <Modal.Body>
                    {selectedNeed ? (
                        // Mode détails
                        <div>
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
                                <Col md={6}>
                                    <strong>Statut:</strong>
                                    <p>{getStatusBadge(selectedNeed.status)}</p>
                                </Col>
                                <Col md={6}>
                                    <strong>Date de soumission:</strong>
                                    <p><Calendar className="me-1" />{formatDate(selectedNeed.created_at)}</p>
                                </Col>
                            </Row>

                            <div className="mb-3">
                                <strong>Description:</strong>
                                <p>{selectedNeed.description}</p>
                            </div>

                            {selectedNeed.approved_by && (
                                <div className="mb-3">
                                    <strong>Traité par:</strong>
                                    <p><Person className="me-1" />{selectedNeed.approved_by.name}</p>
                                    <small className="text-muted">
                                        Le {formatDate(selectedNeed.approved_at)}
                                    </small>
                                </div>
                            )}

                            {selectedNeed.rejection_reason && (
                                <div className="mb-3">
                                    <strong>Motif du rejet:</strong>
                                    <div className="alert alert-danger">
                                        {selectedNeed.rejection_reason}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Mode création/modification
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nom du besoin *</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ex: Matériel informatique, Fournitures..."
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Montant estimé (FCFA) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Description détaillée *</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    placeholder="Décrivez précisément votre besoin, sa justification et son usage prévu..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Plus votre description est détaillée, plus votre demande a de chances d'être approuvée.
                                </Form.Text>
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            setShowModal(false);
                            setEditingNeed(null);
                            setSelectedNeed(null);
                            setFormData({ name: '', description: '', amount: '' });
                        }}
                    >
                        {selectedNeed ? 'Fermer' : 'Annuler'}
                    </Button>
                    {!selectedNeed && (
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    {editingNeed ? 'Modification...' : 'Soumission...'}
                                </>
                            ) : (
                                <>
                                    {editingNeed ? (
                                        <>
                                            <PencilSquare className="me-2" />
                                            Modifier le Besoin
                                        </>
                                    ) : (
                                        <>
                                            <CurrencyDollar className="me-2" />
                                            Soumettre le Besoin
                                        </>
                                    )}
                                </>
                            )}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MyNeeds;