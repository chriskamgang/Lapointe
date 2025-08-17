import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge, Card, Table, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { PlusCircle, PencilFill, Trash2, PersonFill, JournalBookmarkFill, HouseHeartFill } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';

const TeacherAssignments = () => {
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [schoolClasses, setSchoolClasses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [assignmentData, setAssignmentData] = useState({
        subject_id: '',
        class_series_id: '',
        coefficient: 1,
        is_main_teacher: false
    });
    const [activeTab, setActiveTab] = useState('assignments');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [teachersRes, subjectsRes, classesRes] = await Promise.all([
                secureApiEndpoints.teachers.getAll({ with_details: true }),
                secureApiEndpoints.subjects.getAll({ active: true }),
                secureApiEndpoints.schoolClasses.getAll()
            ]);

            if (teachersRes.success) setTeachers(teachersRes.data);
            if (subjectsRes.success) setSubjects(subjectsRes.data);
            if (classesRes.success) setSchoolClasses(classesRes.data);

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            Swal.fire('Erreur', 'Impossible de charger les données', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleShowAssignModal = (teacher) => {
        setSelectedTeacher(teacher);
        setAssignmentData({
            subject_id: '',
            class_series_id: '',
            coefficient: 1,
            is_main_teacher: false
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedTeacher(null);
        setAssignmentData({
            subject_id: '',
            class_series_id: '',
            coefficient: 1,
            is_main_teacher: false
        });
    };

    const handleInputChange = (field, value) => {
        setAssignmentData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAssignSubject = async (e) => {
        e.preventDefault();
        
        if (!selectedTeacher || !assignmentData.subject_id || !assignmentData.class_series_id) {
            Swal.fire('Erreur', 'Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        try {
            const response = await secureApiEndpoints.teachers.assignSubjects(selectedTeacher.id, {
                assignments: [{
                    subject_id: assignmentData.subject_id,
                    class_series_id: assignmentData.class_series_id,
                    coefficient: assignmentData.coefficient,
                    is_main_teacher: assignmentData.is_main_teacher
                }]
            });

            if (response.success) {
                Swal.fire('Succès!', 'Affectation créée avec succès', 'success');
                handleCloseModal();
                loadData();
            }
        } catch (error) {
            console.error('Erreur lors de l\'affectation:', error);
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const handleRemoveAssignment = async (teacherId, subjectId, classSeriesId) => {
        try {
            const result = await Swal.fire({
                title: 'Confirmation',
                text: 'Êtes-vous sûr de vouloir supprimer cette affectation ?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Oui, supprimer',
                cancelButtonText: 'Annuler',
                confirmButtonColor: '#d33'
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.teachers.removeAssignment(teacherId, {
                    subject_id: subjectId,
                    class_series_id: classSeriesId
                });

                if (response.success) {
                    Swal.fire('Succès!', 'Affectation supprimée avec succès', 'success');
                    loadData();
                }
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            Swal.fire('Erreur', error.response?.data?.message || 'Une erreur est survenue', 'error');
        }
    };

    const getSubjectName = (subjectId) => {
        const subject = subjects.find(s => s.id === subjectId);
        return subject ? subject.name : 'Matière inconnue';
    };

    const getClassName = (classId) => {
        const schoolClass = schoolClasses.find(c => c.id === classId);
        return schoolClass ? `${schoolClass.name} (${schoolClass.level?.name || ''})` : 'Classe inconnue';
    };

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>Affectation des Enseignants</h2>
                    <p className="text-muted">Gérez les affectations des enseignants aux matières et classes</p>
                </div>
            </div>

            {/* Tabs */}
            <Card className="mb-4">
                <Card.Body>
                    <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                        <Tab eventKey="assignments" title="Vue par Enseignant">
                            <div className="row g-4">
                                {teachers.map((teacher) => (
                                    <div key={teacher.id} className="col-md-6 col-lg-4">
                                        <Card className="h-100">
                                            <Card.Header className="d-flex justify-content-between align-items-center">
                                                <div className="d-flex align-items-center">
                                                    <PersonFill className="text-primary me-2" />
                                                    <strong>{teacher.full_name}</strong>
                                                </div>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleShowAssignModal(teacher)}
                                                >
                                                    <PlusCircle size={14} className="me-1" />
                                                    Affecter
                                                </Button>
                                            </Card.Header>
                                            <Card.Body>
                                                <div className="mb-2">
                                                    <small className="text-muted">
                                                        <strong>Contact:</strong> {teacher.phone_number}
                                                    </small>
                                                </div>
                                                
                                                {teacher.teacher_subjects && teacher.teacher_subjects.length > 0 ? (
                                                    <div>
                                                        <small className="text-muted mb-2 d-block">Affectations actuelles:</small>
                                                        {teacher.teacher_subjects.map((assignment, index) => (
                                                            <div key={index} className="mb-2 p-2 bg-light rounded">
                                                                <div className="d-flex justify-content-between align-items-start">
                                                                    <div>
                                                                        <strong className="text-primary">
                                                                            {getSubjectName(assignment.subject_id)}
                                                                        </strong>
                                                                        <br />
                                                                        <small className="text-muted">
                                                                            {getClassName(assignment.class_series_id)}
                                                                        </small>
                                                                        <br />
                                                                        <Badge bg="secondary" className="me-1">
                                                                            Coeff: {assignment.coefficient}
                                                                        </Badge>
                                                                        {assignment.is_main_teacher && (
                                                                            <Badge bg="success">Professeur Principal</Badge>
                                                                        )}
                                                                    </div>
                                                                    <Button
                                                                        variant="outline-danger"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveAssignment(teacher.id, assignment.subject_id, assignment.class_series_id)}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-muted py-3">
                                                        <JournalBookmarkFill size={24} className="mb-2" />
                                                        <br />
                                                        <small>Aucune affectation</small>
                                                    </div>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </Tab>

                        <Tab eventKey="subjects" title="Vue par Matière">
                            <div className="row g-4">
                                {subjects.map((subject) => (
                                    <div key={subject.id} className="col-md-6 col-lg-4">
                                        <Card className="h-100">
                                            <Card.Header>
                                                <div className="d-flex align-items-center">
                                                    <JournalBookmarkFill className="text-primary me-2" />
                                                    <strong>{subject.name}</strong>
                                                    <Badge bg="secondary" className="ms-2">{subject.code}</Badge>
                                                </div>
                                            </Card.Header>
                                            <Card.Body>
                                                <div className="text-center text-muted py-3">
                                                    <small>Enseignants affectés à cette matière</small>
                                                    <br />
                                                    <small className="text-info">Fonctionnalité en développement</small>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </Tab>

                        <Tab eventKey="classes" title="Vue par Classe">
                            <div className="row g-4">
                                {schoolClasses.map((schoolClass) => (
                                    <div key={schoolClass.id} className="col-md-6 col-lg-4">
                                        <Card className="h-100">
                                            <Card.Header>
                                                <div className="d-flex align-items-center">
                                                    <HouseHeartFill className="text-primary me-2" />
                                                    <strong>{schoolClass.name}</strong>
                                                    {schoolClass.level && (
                                                        <Badge bg="info" className="ms-2">{schoolClass.level.name}</Badge>
                                                    )}
                                                </div>
                                            </Card.Header>
                                            <Card.Body>
                                                <div className="text-center text-muted py-3">
                                                    <small>Enseignants de cette classe</small>
                                                    <br />
                                                    <small className="text-info">Fonctionnalité en développement</small>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>

            {/* Modal d'affectation */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Affecter une matière à {selectedTeacher?.full_name}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAssignSubject}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Matière <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        value={assignmentData.subject_id}
                                        onChange={(e) => handleInputChange('subject_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner une matière...</option>
                                        {subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name} ({subject.code})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Classe <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        value={assignmentData.class_series_id}
                                        onChange={(e) => handleInputChange('class_series_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner une classe...</option>
                                        {schoolClasses.map((schoolClass) => (
                                            <option key={schoolClass.id} value={schoolClass.id}>
                                                {schoolClass.name} {schoolClass.level && `(${schoolClass.level.name})`}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Coefficient</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="10"
                                        step="0.5"
                                        value={assignmentData.coefficient}
                                        onChange={(e) => handleInputChange('coefficient', parseFloat(e.target.value) || 1)}
                                    />
                                    <Form.Text className="text-muted">
                                        Coefficient de la matière pour cette classe
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        label="Professeur principal de cette classe"
                                        checked={assignmentData.is_main_teacher}
                                        onChange={(e) => handleInputChange('is_main_teacher', e.target.checked)}
                                    />
                                    <Form.Text className="text-muted">
                                        Cet enseignant sera le professeur principal de la classe sélectionnée
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
                            <PlusCircle className="me-2" />
                            Affecter
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default TeacherAssignments;