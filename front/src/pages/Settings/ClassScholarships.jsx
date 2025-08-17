import { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Table,
    Button,
    Modal,
    Form,
    Alert,
    Spinner,
    Badge,
    ButtonGroup
} from 'react-bootstrap';
import {
    Plus,
    PencilSquare,
    Trash,
    Building,
    CurrencyDollar,
    Check,
    X,
    InfoCircle
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';

const ClassScholarships = () => {
    const [scholarships, setScholarships] = useState([]);
    const [schoolClasses, setSchoolClasses] = useState([]);
    const [paymentTranches, setPaymentTranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [showModal, setShowModal] = useState(false);
    const [editingScholarship, setEditingScholarship] = useState(null);
    
    const [form, setForm] = useState({
        school_class_id: '',
        payment_tranche_id: '',
        name: '',
        description: '',
        amount: '',
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Charger les bourses, classes et tranches de paiement en parallèle
            const [scholarshipsResponse, classesResponse, tranchesResponse] = await Promise.all([
                secureApiEndpoints.scholarships.getAll(),
                secureApiEndpoints.schoolClasses.getAll(),
                secureApiEndpoints.paymentTranches.getAll()
            ]);
            
            if (scholarshipsResponse.success) {
                setScholarships(scholarshipsResponse.data);
            }
            
            if (classesResponse.success) {
                setSchoolClasses(classesResponse.data);
            }
            
            if (tranchesResponse.success) {
                setPaymentTranches(tranchesResponse.data);
            }
            
        } catch (error) {
            setError('Erreur lors du chargement des données');
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (scholarship = null) => {
        if (scholarship) {
            setEditingScholarship(scholarship);
            setForm({
                school_class_id: scholarship.school_class_id,
                payment_tranche_id: scholarship.payment_tranche_id || '',
                name: scholarship.name,
                description: scholarship.description || '',
                amount: scholarship.amount,
                is_active: scholarship.is_active
            });
        } else {
            setEditingScholarship(null);
            setForm({
                school_class_id: '',
                payment_tranche_id: '',
                name: '',
                description: '',
                amount: '',
                is_active: true
            });
        }
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingScholarship(null);
        setForm({
            school_class_id: '',
            payment_tranche_id: '',
            name: '',
            description: '',
            amount: '',
            is_active: true
        });
    };

    const handleInputChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.school_class_id || !form.payment_tranche_id || !form.name || !form.amount) {
            setError('Veuillez remplir tous les champs obligatoires');
            return;
        }

        if (parseFloat(form.amount) < 0) {
            setError('Le montant doit être positif');
            return;
        }

        try {
            setSaving(true);
            setError('');
            
            const scholarshipData = {
                ...form,
                amount: parseFloat(form.amount)
            };

            let response;
            if (editingScholarship) {
                response = await secureApiEndpoints.scholarships.update(editingScholarship.id, scholarshipData);
            } else {
                response = await secureApiEndpoints.scholarships.create(scholarshipData);
            }
            
            if (response.success) {
                setSuccess(editingScholarship ? 'Bourse mise à jour avec succès' : 'Bourse créée avec succès');
                handleCloseModal();
                await loadData();
                
                // Notification de succès
                Swal.fire({
                    title: 'Succès !',
                    text: response.message,
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
            } else {
                setError(response.message || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            setError('Erreur lors de la sauvegarde de la bourse');
            console.error('Error saving scholarship:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (scholarship) => {
        const result = await Swal.fire({
            title: 'Confirmer la suppression',
            text: `Êtes-vous sûr de vouloir supprimer la bourse "${scholarship.name}" ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                const response = await secureApiEndpoints.scholarships.delete(scholarship.id);
                
                if (response.success) {
                    setSuccess('Bourse supprimée avec succès');
                    await loadData();
                    
                    Swal.fire({
                        title: 'Supprimé !',
                        text: 'La bourse a été supprimée avec succès.',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    });
                } else {
                    setError(response.message || 'Erreur lors de la suppression');
                }
            } catch (error) {
                setError('Erreur lors de la suppression de la bourse');
                console.error('Error deleting scholarship:', error);
            }
        }
    };

    const formatAmount = (amount) => {
        return parseInt(amount).toLocaleString() + ' FCFA';
    };

    const getClassName = (classId) => {
        const schoolClass = schoolClasses.find(c => c.id === classId);
        return schoolClass ? schoolClass.name : 'Classe inconnue';
    };

    const getTrancheName = (trancheId) => {
        const tranche = paymentTranches.find(t => t.id === trancheId);
        return tranche ? tranche.name : 'Tranche inconnue';
    };

    if (loading) {
        return (
            <Container fluid className="py-4">
                <div className="text-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </Spinner>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>Gestion des Bourses par Classe</h2>
                            <p className="text-muted">Créez et gérez les bourses disponibles pour chaque classe</p>
                        </div>
                        <Button 
                            variant="primary" 
                            onClick={() => handleOpenModal()}
                        >
                            <Plus size={16} className="me-2" />
                            Nouvelle Bourse
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

            {/* Info Card */}
            <Row className="mb-4">
                <Col>
                    <Card className="border-info">
                        <Card.Body>
                            <div className="d-flex align-items-start">
                                <InfoCircle size={20} className="text-info me-3 mt-1" />
                                <div>
                                    <h6 className="text-info mb-2">À propos des bourses</h6>
                                    <p className="text-muted mb-0">
                                        Les bourses sont appliquées automatiquement aux étudiants éligibles lors des paiements, 
                                        en fonction de leur classe et du respect de la date limite configurée dans les paramètres d'établissement.
                                    </p>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Scholarships Table */}
            <Row>
                <Col>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">
                                <Building className="me-2" />
                                Bourses Configurées ({scholarships.length})
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {scholarships.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-muted">Aucune bourse configurée</p>
                                    <Button 
                                        variant="outline-primary" 
                                        onClick={() => handleOpenModal()}
                                    >
                                        <Plus size={16} className="me-2" />
                                        Créer la première bourse
                                    </Button>
                                </div>
                            ) : (
                                <Table responsive hover>
                                    <thead>
                                        <tr>
                                            <th>Classe</th>
                                            <th>Tranche</th>
                                            <th>Nom de la Bourse</th>
                                            <th>Description</th>
                                            <th>Montant</th>
                                            <th>Statut</th>
                                            <th width="120">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scholarships.map((scholarship) => (
                                            <tr key={scholarship.id}>
                                                <td>
                                                    <strong>{getClassName(scholarship.school_class_id)}</strong>
                                                </td>
                                                <td>
                                                    <Badge bg="info" className="me-1">
                                                        {getTrancheName(scholarship.payment_tranche_id)}
                                                    </Badge>
                                                </td>
                                                <td>{scholarship.name}</td>
                                                <td>
                                                    {scholarship.description ? (
                                                        <span className="text-muted">{scholarship.description}</span>
                                                    ) : (
                                                        <em className="text-muted">Aucune description</em>
                                                    )}
                                                </td>
                                                <td>
                                                    <strong className="text-success">
                                                        {formatAmount(scholarship.amount)}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <Badge bg={scholarship.is_active ? 'success' : 'secondary'}>
                                                        {scholarship.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <ButtonGroup size="sm">
                                                        <Button
                                                            variant="outline-primary"
                                                            onClick={() => handleOpenModal(scholarship)}
                                                            title="Modifier"
                                                        >
                                                            <PencilSquare size={14} />
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            onClick={() => handleDelete(scholarship)}
                                                            title="Supprimer"
                                                        >
                                                            <Trash size={14} />
                                                        </Button>
                                                    </ButtonGroup>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modal pour créer/modifier une bourse */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingScholarship ? 'Modifier la Bourse' : 'Nouvelle Bourse'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Classe *</Form.Label>
                                    <Form.Select
                                        value={form.school_class_id}
                                        onChange={(e) => handleInputChange('school_class_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner une classe</option>
                                        {schoolClasses.map((schoolClass) => (
                                            <option key={schoolClass.id} value={schoolClass.id}>
                                                {schoolClass.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Tranche de Paiement *</Form.Label>
                                    <Form.Select
                                        value={form.payment_tranche_id}
                                        onChange={(e) => handleInputChange('payment_tranche_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner une tranche</option>
                                        {paymentTranches.map((tranche) => (
                                            <option key={tranche.id} value={tranche.id}>
                                                {tranche.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nom de la Bourse *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="Ex: Bourse d'Excellence"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <CurrencyDollar className="me-1" />
                                        Montant (FCFA) *
                                    </Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.amount}
                                        onChange={(e) => handleInputChange('amount', e.target.value)}
                                        placeholder="Ex: 50000"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Statut</Form.Label>
                                    <Form.Select
                                        value={form.is_active ? 'true' : 'false'}
                                        onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder="Description de la bourse (optionnel)..."
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            <X size={16} className="me-2" />
                            Annuler
                        </Button>
                        <Button variant="primary" type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Sauvegarde...
                                </>
                            ) : (
                                <>
                                    <Check size={16} className="me-2" />
                                    {editingScholarship ? 'Mettre à jour' : 'Créer la Bourse'}
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default ClassScholarships;