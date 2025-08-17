import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge, ButtonGroup, Card, Table } from 'react-bootstrap';
import { LoadingSpinner } from '../../components/UI';
import { PlusCircle, PencilFill, Trash2, Eye, EyeSlashFill, Search } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';

const Subjects = () => {
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        is_active: true
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        loadSubjects();
    }, []);

    useEffect(() => {
        filterSubjects();
    }, [subjects, searchTerm, statusFilter]);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.subjects.getAll();
            if (response.success) {
                setSubjects(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des matières:', error);
            Swal.fire('Erreur', 'Impossible de charger les matières', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterSubjects = () => {
        let filtered = subjects;

        // Filtrer par terme de recherche
        if (searchTerm) {
            filtered = filtered.filter(subject =>
                subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                subject.code.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtrer par statut
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            filtered = filtered.filter(subject => subject.is_active === isActive);
        }

        setFilteredSubjects(filtered);
    };

    const handleShowModal = (subject = null) => {
        if (subject) {
            setEditingSubject(subject);
            setFormData({
                name: subject.name,
                code: subject.code,
                description: subject.description || '',
                is_active: subject.is_active
            });
        } else {
            setEditingSubject(null);
            setFormData({
                name: '',
                code: '',
                description: '',
                is_active: true
            });
        }
        setFormErrors({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingSubject(null);
        setFormData({
            name: '',
            code: '',
            description: '',
            is_active: true
        });
        setFormErrors({});
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Nettoyer les erreurs du champ modifié
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            let response;
            if (editingSubject) {
                response = await secureApiEndpoints.subjects.update(editingSubject.id, formData);
            } else {
                response = await secureApiEndpoints.subjects.create(formData);
            }

            if (response.success) {
                Swal.fire(
                    'Succès!',
                    editingSubject ? 'Matière mise à jour avec succès' : 'Matière créée avec succès',
                    'success'
                );
                handleCloseModal();
                loadSubjects();
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            } else {
                Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
            }
        }
    };

    const handleToggleStatus = async (subject) => {
        try {
            const result = await Swal.fire({
                title: 'Confirmation',
                text: `Voulez-vous ${subject.is_active ? 'désactiver' : 'activer'} cette matière ?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Oui',
                cancelButtonText: 'Annuler'
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.subjects.toggleStatus(subject.id);

                if (response.success) {
                    Swal.fire('Succès!', 'Statut mis à jour avec succès', 'success');
                    loadSubjects();
                }
            }
        } catch (error) {
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const handleDelete = async (subject) => {
        try {
            const result = await Swal.fire({
                title: 'Confirmation',
                text: 'Êtes-vous sûr de vouloir supprimer cette matière ? Cette action est irréversible.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Oui, supprimer',
                cancelButtonText: 'Annuler',
                confirmButtonColor: '#d33'
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.subjects.delete(subject.id);

                if (response.success) {
                    Swal.fire('Supprimé!', 'Matière supprimée avec succès', 'success');
                    loadSubjects();
                }
            }
        } catch (error) {
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const getStatusBadge = (isActive) => {
        return (
            <Badge bg={isActive ? 'success' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
            </Badge>
        );
    };

    if (loading && subjects.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Gestion des Matières</h2>
                <Button variant="primary" onClick={() => handleShowModal()}>
                    <PlusCircle className="me-2" />
                    Nouvelle Matière
                </Button>
            </div>

            {/* Filtres */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="position-relative">
                                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                <Form.Control
                                    type="text"
                                    placeholder="Rechercher par nom ou code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="ps-5"
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="active">Actives uniquement</option>
                                <option value="inactive">Inactives uniquement</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-3">
                            <div className="text-muted">
                                Total: {filteredSubjects.length} matière(s)
                            </div>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Tableau des matières */}
            <Card>
                <Table responsive>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Nom</th>
                            <th>Description</th>
                            <th>Statut</th>
                            <th width="150">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSubjects.length > 0 ? (
                            filteredSubjects.map((subject) => (
                                <tr key={subject.id}>
                                    <td>
                                        <code className="fs-6">{subject.code}</code>
                                    </td>
                                    <td>
                                        <strong>{subject.name}</strong>
                                    </td>
                                    <td>
                                        <small className="text-muted">
                                            {subject.description || '-'}
                                        </small>
                                    </td>
                                    <td>
                                        {getStatusBadge(subject.is_active)}
                                    </td>
                                    <td>
                                        <ButtonGroup size="sm">
                                            <Button
                                                variant="outline-primary"
                                                onClick={() => handleShowModal(subject)}
                                                title="Modifier"
                                            >
                                                <PencilFill size={14} />
                                            </Button>
                                            <Button
                                                variant={subject.is_active ? "outline-warning" : "outline-success"}
                                                onClick={() => handleToggleStatus(subject)}
                                                title={subject.is_active ? "Désactiver" : "Activer"}
                                            >
                                                {subject.is_active ? <EyeSlashFill size={14} /> : <Eye size={14} />}
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                onClick={() => handleDelete(subject)}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </ButtonGroup>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center py-4">
                                    <div className="text-muted">
                                        {searchTerm || statusFilter !== 'all' 
                                            ? 'Aucune matière ne correspond aux critères de recherche'
                                            : 'Aucune matière trouvée'
                                        }
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Modal de création/édition */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingSubject ? 'Modifier la Matière' : 'Nouvelle Matière'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>Nom de la matière <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        isInvalid={!!formErrors.name}
                                        placeholder="Ex: Mathématiques"
                                        required
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.name && formErrors.name[0]}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>Code <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleInputChange}
                                        isInvalid={!!formErrors.code}
                                        placeholder="Ex: MATH"
                                        maxLength="10"
                                        style={{ textTransform: 'uppercase' }}
                                        required
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {formErrors.code && formErrors.code[0]}
                                    </Form.Control.Feedback>
                                    <Form.Text className="text-muted">
                                        Code unique pour identifier la matière (max 10 caractères)
                                    </Form.Text>
                                </Form.Group>
                            </div>
                            <div className="col-12">
                                <Form.Group>
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Description optionnelle de la matière..."
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-12">
                                <Form.Check
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                    label="Matière active"
                                />
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Annuler
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Enregistrement...' : editingSubject ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default Subjects;