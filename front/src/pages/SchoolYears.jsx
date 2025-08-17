import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { Plus, Pencil, Star, StarFill } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../utils/apiMigration';

const SchoolYears = () => {
    const [schoolYears, setSchoolYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingYear, setEditingYear] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        is_current: false
    });

    useEffect(() => {
        loadSchoolYears();
    }, []);

    const loadSchoolYears = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.schoolYears.getAll();
            setSchoolYears(response.data);
        } catch (error) {
            setError('Erreur lors du chargement des années scolaires: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleShowModal = (year = null) => {
        if (year) {
            setEditingYear(year);
            setFormData({
                name: year.name,
                start_date: year.start_date,
                end_date: year.end_date,
                is_current: year.is_current
            });
        } else {
            setEditingYear(null);
            setFormData({
                name: '',
                start_date: '',
                end_date: '',
                is_current: false
            });
        }
        setShowModal(true);
        setError('');
        setSuccess('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingYear(null);
        setError('');
        setSuccess('');
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (editingYear) {
                await secureApiEndpoints.schoolYears.update(editingYear.id, formData);
                setSuccess('Année scolaire modifiée avec succès');
            } else {
                await secureApiEndpoints.schoolYears.create(formData);
                setSuccess('Année scolaire ajoutée avec succès');
            }
            
            await loadSchoolYears();
            setTimeout(() => {
                handleCloseModal();
                setSuccess('');
            }, 1500);
        } catch (error) {
            setError('Erreur: ' + error.message);
        }
    };

    const handleSetCurrent = async (yearId) => {
        try {
            await secureApiEndpoints.schoolYears.setCurrent(yearId);
            setSuccess('Année scolaire courante définie avec succès');
            await loadSchoolYears();
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError('Erreur lors de la définition de l\'année courante: ' + error.message);
            setTimeout(() => setError(''), 5000);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <Container fluid className="py-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>Gestion des Années Scolaires</h2>
                        <Button 
                            variant="primary" 
                            onClick={() => handleShowModal()}
                        >
                            <Plus size={18} className="me-2" />
                            Ajouter une année
                        </Button>
                    </div>
                </Col>
            </Row>

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

            <Row>
                <Col>
                    <Card>
                        <Card.Body>
                            <Table responsive hover>
                                <thead>
                                    <tr>
                                        <th>Nom de l'année</th>
                                        <th>Date de début</th>
                                        <th>Date de fin</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schoolYears.map(year => (
                                        <tr key={year.id}>
                                            <td>
                                                <strong>{year.name}</strong>
                                                {year.is_current && (
                                                    <Badge bg="success" className="ms-2">
                                                        <StarFill size={12} className="me-1" />
                                                        Année courante
                                                    </Badge>
                                                )}
                                            </td>
                                            <td>{formatDate(year.start_date)}</td>
                                            <td>{formatDate(year.end_date)}</td>
                                            <td>
                                                <Badge bg={year.is_active ? 'success' : 'secondary'}>
                                                    {year.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleShowModal(year)}
                                                    >
                                                        <Pencil size={14} />
                                                    </Button>
                                                    {!year.is_current && (
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            onClick={() => handleSetCurrent(year.id)}
                                                            title="Définir comme année courante"
                                                        >
                                                            <Star size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {schoolYears.length === 0 && (
                                <div className="text-center py-4">
                                    <p className="text-muted">Aucune année scolaire trouvée</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingYear ? 'Modifier l\'année scolaire' : 'Ajouter une année scolaire'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}

                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nom de l'année *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Ex: 2024-2025"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Date de début *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Date de fin *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        name="is_current"
                                        checked={formData.is_current}
                                        onChange={handleInputChange}
                                        label="Définir comme année scolaire courante"
                                    />
                                    <Form.Text className="text-muted">
                                        Si cochée, cette année deviendra l'année de référence par défaut
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Annuler
                        </Button>
                        <Button variant="primary" type="submit">
                            {editingYear ? 'Modifier' : 'Ajouter'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default SchoolYears;