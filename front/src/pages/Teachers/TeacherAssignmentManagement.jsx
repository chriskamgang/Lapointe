import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge, Card, Table, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { PlusCircle, PersonFill, JournalBookmarkFill, HouseHeartFill, Trash2, Calendar } from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';

const TeacherAssignmentManagement = () => {
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [seriesSubjects, setSeriesSubjects] = useState([]);
    const [schoolYears, setSchoolYears] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [mainTeachers, setMainTeachers] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showMainTeacherModal, setShowMainTeacherModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState('current');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [assignmentData, setAssignmentData] = useState({
        series_subject_id: ''
    });
    const [mainTeacherData, setMainTeacherData] = useState({
        school_class_id: ''
    });
    const [activeTab, setActiveTab] = useState('assignments');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedSchoolYear) {
            loadYearData();
        }
    }, [selectedSchoolYear]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [teachersRes, schoolYearsRes, seriesSubjectsRes] = await Promise.all([
                secureApiEndpoints.teachers.getAll({ active: true }),
                secureApiEndpoints.schoolYears.getActiveYears(),
                secureApiEndpoints.seriesSubjects.getAll({ active: true })
            ]);

            if (teachersRes.success) setTeachers(teachersRes.data);
            if (schoolYearsRes.success) setSchoolYears(schoolYearsRes.data);
            if (seriesSubjectsRes.success) setSeriesSubjects(seriesSubjectsRes.data);

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            Swal.fire('Erreur', 'Impossible de charger les données', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadYearData = async () => {
        try {
            const yearId = selectedSchoolYear === 'current' ? null : selectedSchoolYear;
            
            // Construire les paramètres sans school_year_id si yearId est null
            const assignmentParams = { active: true };
            const mainTeacherParams = { active: true };
            
            if (yearId !== null) {
                assignmentParams.school_year_id = yearId;
                mainTeacherParams.school_year_id = yearId;
            }
            
            const [assignmentsRes, mainTeachersRes] = await Promise.all([
                secureApiEndpoints.teacherAssignments.getAll(assignmentParams),
                secureApiEndpoints.mainTeachers.getAll(mainTeacherParams)
            ]);

            if (assignmentsRes.success) setAssignments(assignmentsRes.data);
            if (mainTeachersRes.success) setMainTeachers(mainTeachersRes.data);

        } catch (error) {
            console.error('Erreur lors du chargement des données de l\'année:', error);
        }
    };

    const handleShowAssignModal = async (teacher) => {
        setSelectedTeacher(teacher);
        
        try {
            const yearId = selectedSchoolYear === 'current' ? null : selectedSchoolYear;
            const params = {};
            if (yearId !== null) {
                params.school_year_id = yearId;
            }
            const availableRes = await secureApiEndpoints.teacherAssignments.getAvailableSubjects(teacher.id, params);

            if (availableRes.success) {
                setAvailableSubjects(availableRes.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des matières disponibles:', error);
        }

        setAssignmentData({ series_subject_id: '' });
        setShowAssignModal(true);
    };

    const handleShowMainTeacherModal = async () => {
        try {
            const yearId = selectedSchoolYear === 'current' ? null : selectedSchoolYear;
            const params = {};
            if (yearId !== null) {
                params.school_year_id = yearId;
            }
            const [availableTeachersRes, availableClassesRes] = await Promise.all([
                secureApiEndpoints.mainTeachers.getAvailableTeachers(params),
                secureApiEndpoints.mainTeachers.getClassesWithoutMainTeacher(params)
            ]);

            if (availableTeachersRes.success) setTeachers(prev => prev.filter(t => 
                availableTeachersRes.data.some(at => at.id === t.id)
            ));
            if (availableClassesRes.success) setAvailableClasses(availableClassesRes.data);

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }

        setMainTeacherData({ school_class_id: '' });
        setShowMainTeacherModal(true);
    };

    const handleAssignSubject = async (e) => {
        e.preventDefault();
        
        if (!selectedTeacher || !assignmentData.series_subject_id) {
            Swal.fire('Erreur', 'Veuillez sélectionner une matière', 'error');
            return;
        }

        try {
            const yearId = selectedSchoolYear === 'current' ? null : selectedSchoolYear;
            const data = {
                teacher_id: selectedTeacher.id,
                series_subject_id: assignmentData.series_subject_id
            };
            if (yearId !== null) {
                data.school_year_id = yearId;
            }
            const response = await secureApiEndpoints.teacherAssignments.create(data);

            if (response.success) {
                Swal.fire('Succès!', response.message || 'Enseignant affecté avec succès', 'success');
                setShowAssignModal(false);
                loadYearData();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de l\'affectation', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de l\'affectation:', error);
            let errorMessage = 'Une erreur est survenue';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            
            Swal.fire('Erreur', errorMessage, 'error');
        }
    };

    const handleAssignMainTeacher = async (e) => {
        e.preventDefault();
        
        if (!selectedTeacher || !mainTeacherData.school_class_id) {
            Swal.fire('Erreur', 'Veuillez sélectionner un enseignant et une classe', 'error');
            return;
        }

        try {
            const yearId = selectedSchoolYear === 'current' ? null : selectedSchoolYear;
            const data = {
                teacher_id: selectedTeacher.id,
                school_class_id: mainTeacherData.school_class_id
            };
            if (yearId !== null) {
                data.school_year_id = yearId;
            }
            const response = await secureApiEndpoints.mainTeachers.create(data);

            if (response.success) {
                Swal.fire('Succès!', response.message || 'Professeur principal désigné avec succès', 'success');
                setShowMainTeacherModal(false);
                loadYearData();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de la désignation', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la désignation:', error);
            let errorMessage = 'Une erreur est survenue';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            
            Swal.fire('Erreur', errorMessage, 'error');
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
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
                const response = await secureApiEndpoints.teacherAssignments.delete(assignmentId);
                if (response.success) {
                    Swal.fire('Supprimé!', response.message || 'Affectation supprimée avec succès', 'success');
                    loadYearData();
                }
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            let errorMessage = 'Une erreur est survenue';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            
            Swal.fire('Erreur', errorMessage, 'error');
        }
    };

    const handleRemoveMainTeacher = async (mainTeacherId) => {
        try {
            const result = await Swal.fire({
                title: 'Confirmation',
                text: 'Êtes-vous sûr de vouloir retirer ce professeur principal ?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Oui, retirer',
                cancelButtonText: 'Annuler',
                confirmButtonColor: '#d33'
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.mainTeachers.delete(mainTeacherId);
                if (response.success) {
                    Swal.fire('Retiré!', response.message || 'Professeur principal retiré avec succès', 'success');
                    loadYearData();
                }
            }
        } catch (error) {
            console.error('Erreur lors du retrait:', error);
            let errorMessage = 'Une erreur est survenue';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            
            Swal.fire('Erreur', errorMessage, 'error');
        }
    };

    const getTeacherAssignments = (teacherId) => {
        return assignments.filter(a => a.teacher_id === teacherId);
    };

    const getTeacherMainClasses = (teacherId) => {
        return mainTeachers.filter(mt => mt.teacher_id === teacherId);
    };

    const getCurrentSchoolYear = () => {
        if (selectedSchoolYear === 'current') {
            const currentYear = schoolYears.find(y => y.is_current);
            return currentYear ? currentYear.name : 'Année courante';
        }
        const year = schoolYears.find(y => y.id === parseInt(selectedSchoolYear));
        return year ? year.name : 'Année sélectionnée';
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
                    <p className="text-muted">Gérez les affectations des enseignants aux matières configurées et désignez les professeurs principaux</p>
                </div>
                <div className="d-flex gap-2">
                    <Button 
                        variant="success" 
                        onClick={handleShowMainTeacherModal}
                    >
                        <PlusCircle className="me-2" />
                        Désigner Professeur Principal
                    </Button>
                </div>
            </div>

            {/* School Year Selector */}
            <Card className="mb-4">
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="d-flex align-items-center">
                                    <Calendar className="me-2" />
                                    Année scolaire
                                </Form.Label>
                                <Form.Select
                                    value={selectedSchoolYear}
                                    onChange={(e) => setSelectedSchoolYear(e.target.value)}
                                >
                                    <option value="current">Année courante</option>
                                    {schoolYears.map((year) => (
                                        <option key={year.id} value={year.id}>
                                            {year.name} {year.is_current && '(Courante)'}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Alert variant="info" className="mb-0">
                                <strong>Année sélectionnée:</strong> {getCurrentSchoolYear()}
                            </Alert>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Content Tabs */}
            <Card>
                <Card.Body>
                    <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                        <Tab eventKey="assignments" title="Affectations Matières">
                            <div className="row g-4">
                                {teachers.map((teacher) => {
                                    const teacherAssignments = getTeacherAssignments(teacher.id);
                                    const mainClasses = getTeacherMainClasses(teacher.id);
                                    
                                    return (
                                        <div key={teacher.id} className="col-md-6 col-lg-4">
                                            <Card className="h-100">
                                                <Card.Header className="d-flex justify-content-between align-items-center">
                                                    <div className="d-flex align-items-center">
                                                        <PersonFill className="text-primary me-2" />
                                                        <div>
                                                            <strong>{teacher.full_name || `${teacher.last_name} ${teacher.first_name}`}</strong>
                                                            {mainClasses.length > 0 && (
                                                                <div>
                                                                    <Badge bg="success" className="ms-1">Prof. Principal</Badge>
                                                                </div>
                                                            )}
                                                        </div>
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
                                                            <strong>Téléphone:</strong> {teacher.phone_number}
                                                        </small>
                                                    </div>
                                                    
                                                    {/* Affectations matières */}
                                                    {teacherAssignments.length > 0 ? (
                                                        <div className="mb-3">
                                                            <small className="text-muted mb-2 d-block">
                                                                <strong>Matières assignées:</strong>
                                                            </small>
                                                            {teacherAssignments.map((assignment) => (
                                                                <div key={assignment.id} className="mb-2 p-2 bg-light rounded">
                                                                    <div className="d-flex justify-content-between align-items-start">
                                                                        <div>
                                                                            <strong className="text-primary">
                                                                                {assignment.series_subject?.subject?.name}
                                                                            </strong>
                                                                            <br />
                                                                            <small className="text-muted">
                                                                                {assignment.series_subject?.school_class?.name} 
                                                                                {assignment.series_subject?.school_class?.level && 
                                                                                    ` (${assignment.series_subject.school_class.level.name})`
                                                                                }
                                                                            </small>
                                                                            <br />
                                                                            <Badge bg="secondary">
                                                                                Coeff: {assignment.series_subject?.coefficient}
                                                                            </Badge>
                                                                        </div>
                                                                        <Button
                                                                            variant="outline-danger"
                                                                            size="sm"
                                                                            onClick={() => handleRemoveAssignment(assignment.id)}
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center text-muted py-2">
                                                            <JournalBookmarkFill size={20} className="mb-1" />
                                                            <br />
                                                            <small>Aucune matière assignée</small>
                                                        </div>
                                                    )}

                                                    {/* Classes principales */}
                                                    {mainClasses.length > 0 && (
                                                        <div>
                                                            <small className="text-muted mb-2 d-block">
                                                                <strong>Professeur principal de:</strong>
                                                            </small>
                                                            {mainClasses.map((mainClass) => (
                                                                <div key={mainClass.id} className="mb-2 p-2 bg-success bg-opacity-10 rounded">
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <div>
                                                                            <strong className="text-success">
                                                                                {mainClass.school_class?.name}
                                                                            </strong>
                                                                            {mainClass.school_class?.level && (
                                                                                <span className="text-muted ms-1">
                                                                                    ({mainClass.school_class.level.name})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <Button
                                                                            variant="outline-danger"
                                                                            size="sm"
                                                                            onClick={() => handleRemoveMainTeacher(mainClass.id)}
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </div>
                                    );
                                })}
                            </div>
                        </Tab>

                        <Tab eventKey="summary" title="Résumé">
                            <Row>
                                <Col md={6}>
                                    <Card>
                                        <Card.Header>
                                            <h5>Statistiques des Affectations</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="d-flex justify-content-between py-2">
                                                <span>Enseignants actifs:</span>
                                                <Badge bg="primary">{teachers.length}</Badge>
                                            </div>
                                            <div className="d-flex justify-content-between py-2">
                                                <span>Affectations matières:</span>
                                                <Badge bg="info">{assignments.length}</Badge>
                                            </div>
                                            <div className="d-flex justify-content-between py-2">
                                                <span>Professeurs principaux:</span>
                                                <Badge bg="success">{mainTeachers.length}</Badge>
                                            </div>
                                            <div className="d-flex justify-content-between py-2">
                                                <span>Matières configurées:</span>
                                                <Badge bg="secondary">{seriesSubjects.length}</Badge>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>

            {/* Modal d'affectation matière */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Affecter une matière à {selectedTeacher?.full_name || `${selectedTeacher?.last_name} ${selectedTeacher?.first_name}`}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAssignSubject}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Matière disponible <span className="text-danger">*</span></Form.Label>
                            <Form.Select
                                value={assignmentData.series_subject_id}
                                onChange={(e) => setAssignmentData(prev => ({ ...prev, series_subject_id: e.target.value }))}
                                required
                            >
                                <option value="">Sélectionner une matière configurée...</option>
                                {availableSubjects.map((seriesSubject) => (
                                    <option key={seriesSubject.id} value={seriesSubject.id}>
                                        {seriesSubject.subject?.name} - {seriesSubject.school_class?.name} 
                                        {seriesSubject.school_class?.level && ` (${seriesSubject.school_class.level.name})`} 
                                        - Coeff: {seriesSubject.coefficient}
                                    </option>
                                ))}
                            </Form.Select>
                            {availableSubjects.length === 0 && (
                                <Form.Text className="text-warning">
                                    Aucune matière disponible pour cet enseignant. Assurez-vous que les matières sont configurées dans les séries.
                                </Form.Text>
                            )}
                        </Form.Group>
                        
                        <Alert variant="info">
                            <strong>Information:</strong> Seules les matières préalablement configurées pour les séries apparaissent ici. 
                            Pour ajouter de nouvelles matières, utilisez d'abord la "Configuration Série-Matières".
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
                            Annuler
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit"
                            disabled={!assignmentData.series_subject_id || availableSubjects.length === 0}
                        >
                            <PlusCircle className="me-2" />
                            Affecter
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal désignation professeur principal */}
            <Modal show={showMainTeacherModal} onHide={() => setShowMainTeacherModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Désigner un Professeur Principal
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAssignMainTeacher}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Enseignant <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        value={selectedTeacher?.id || ''}
                                        onChange={(e) => {
                                            const teacher = teachers.find(t => t.id === parseInt(e.target.value));
                                            setSelectedTeacher(teacher);
                                        }}
                                        required
                                    >
                                        <option value="">Sélectionner un enseignant...</option>
                                        {teachers.map((teacher) => (
                                            <option key={teacher.id} value={teacher.id}>
                                                {teacher.full_name || `${teacher.last_name} ${teacher.first_name}`}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Classe <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        value={mainTeacherData.school_class_id}
                                        onChange={(e) => setMainTeacherData(prev => ({ ...prev, school_class_id: e.target.value }))}
                                        required
                                    >
                                        <option value="">Sélectionner une classe...</option>
                                        {availableClasses.map((schoolClass) => (
                                            <option key={schoolClass.id} value={schoolClass.id}>
                                                {schoolClass.name} {schoolClass.level && `(${schoolClass.level.name})`}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <Alert variant="warning">
                            <strong>Important:</strong> Un enseignant ne peut être professeur principal que d'une seule classe par année scolaire.
                            Une classe ne peut avoir qu'un seul professeur principal.
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowMainTeacherModal(false)}>
                            Annuler
                        </Button>
                        <Button 
                            variant="success" 
                            type="submit"
                            disabled={!selectedTeacher || !mainTeacherData.school_class_id}
                        >
                            <PersonFill className="me-2" />
                            Désigner
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default TeacherAssignmentManagement;