import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Modal, Alert } from 'react-bootstrap';
import { 
    PersonPlus, PencilSquare, Trash, CreditCard, Award, 
    Laptop, ShirtT, FileEarmarkText, Eye, ArrowRightCircle
} from 'react-bootstrap-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { secureApiEndpoints } from '../../utils/apiMigration';
import Swal from 'sweetalert2';
import StudentTransfer from '../../components/StudentTransfer';

const SeriesStudents = () => {
    const { seriesId } = useParams();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [series, setSeries] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [studentToTransfer, setStudentToTransfer] = useState(null);

    useEffect(() => {
        if (seriesId) {
            loadStudents();
        }
    }, [seriesId]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const response = await secureApiEndpoints.students.getByClassSeries(seriesId);
            if (response.success) {
                setStudents(response.data.students || []);
                setSeries(response.data.series || null);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des étudiants et de la série:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStudent = () => {
        setSelectedStudent(null);
        setShowCreateModal(true);
    };

    const handleEditStudent = (student) => {
        setSelectedStudent(student);
        setShowEditModal(true);
    };

    const handleDeleteStudent = async (student) => {
        const result = await Swal.fire({
            title: 'Confirmer la suppression',
            text: `Êtes-vous sûr de vouloir supprimer l étudiant "${student.first_name} ${student.last_name}" ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                const response = await secureApiEndpoints.students.delete(student.id);
                if (response.success) {
                    await loadStudents();
                    Swal.fire('Supprimé!', 'L étudiant a été supprimé.', 'success');
                }
            } catch (error) {
                Swal.fire('Erreur!', 'Erreur lors de la suppression.', 'error');
            }
        }
    };

    const handleViewPayments = (student) => {
        navigate(`/student-payment/${student.id}`);
    };

    const handleTransferStudent = (student) => {
        setStudentToTransfer(student);
        setShowTransferModal(true);
    };

    const handleTransferSuccess = () => {
        setShowTransferModal(false);
        setStudentToTransfer(null);
        loadStudents();
        Swal.fire('Succès', 'Étudiant transféré avec succès.', 'success');
    };

    const getScholarshipBadge = (student) => {
        if (!series?.schoolClass?.level?.school) return null;
        
        const schoolCode = series.schoolClass.level.school.code;
        const levelType = series.schoolClass.level.level_type;
        const currentLevel = student.current_level || 1;
        
        const isEligible = checkScholarshipEligibility(schoolCode, levelType);
        
        if (!isEligible) return <Badge bg="secondary">Pas de bourse</Badge>;
        
        const scholarshipAmount = calculateScholarshipAmount(schoolCode, levelType, currentLevel, student);
        
        if (scholarshipAmount > 0) {
            return (
                <Badge bg="success">
                    <Award className="me-1" size={12} />
                    {scholarshipAmount.toLocaleString()} FCFA
                </Badge>
            );
        }
        
        return <Badge bg="secondary">Pas de bourse</Badge>;
    };

    const checkScholarshipEligibility = (schoolCode, levelType) => {
        const eligibilityRules = {
            'INSSAS': ['BTS', 'HND', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO', 'MASTER_PRO'],
            'ESGIT': ['LICENCE_PRO', 'INGENIERIE'],
            'ESSIT': ['INGENIERIE_SC'],
            'ISTPM': ['CQP', 'DQP']
        };
        
        return eligibilityRules[schoolCode]?.includes(levelType) || false;
    };

    const calculateScholarshipAmount = (schoolCode, levelType, currentLevel, student) => {
        switch (schoolCode) {
            case 'INSSAS':
                if (['BTS', 'HND'].includes(levelType)) {
                    return currentLevel === 1 ? 50000 : 100000;
                }
                if (levelType === 'DOUBLE_DIPLOMATION') {
                    return currentLevel === 1 ? 50000 : 100000;
                }
                if (levelType === 'LICENCE_PRO') {
                    return 100000;
                }
                if (levelType === 'MASTER_PRO') {
                    return currentLevel <= 2 ? 150000 : 0;
                }
                break;
                
            case 'ESGIT':
                if (levelType === 'LICENCE_PRO') {
                    const mention = student.bts_mention || 'passable';
                    const amounts = {
                        'passable': 50000,
                        'assez_bien': 100000,
                        'bien': 120000,
                        'tres_bien': 150000
                    };
                    return amounts[mention] || 50000;
                }
                if (levelType === 'INGENIERIE') {
                    return 50000;
                }
                break;
                
            case 'ESSIT':
                if (levelType === 'INGENIERIE_SC') {
                    return 50000;
                }
                break;
                
            case 'ISTPM':
                return 25000;
        }
        
        return 0;
    };

    const getEquipmentBadges = (student) => {
        if (!series?.schoolClass?.level?.school) return null;
        
        const schoolCode = series.schoolClass.level.school.code;
        const levelType = series.schoolClass.level.level_type;
        
        const equipments = getRequiredEquipments(schoolCode, levelType);
        
        return (
            <div className="d-flex gap-1 flex-wrap">
                {equipments.polo && <Badge bg="primary" className="small">Polo</Badge>}
                {equipments.blouse && <Badge bg="success" className="small">Blouse</Badge>}
                {equipments.laptop && <Badge bg="info" className="small">Laptop</Badge>}
                {equipments.rame && <Badge bg="warning" className="small">Rames</Badge>}
            </div>
        );
    };

    const getRequiredEquipments = (schoolCode, levelType) => {
        const configs = {
            'INSSAS': {
                polo: false,
                blouse: true,
                laptop: ['LICENCE_ACA', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO'].includes(levelType),
                rame: true
            },
            'ESGIT': {
                polo: true,
                blouse: false,
                laptop: true,
                rame: true
            },
            'ESJEC': {
                polo: true,
                blouse: false,
                laptop: levelType === 'BTS',
                rame: true
            },
            'ESSIT': {
                polo: true,
                blouse: false,
                laptop: true,
                rame: true
            },
            'ISTPM': {
                polo: true, // À ajuster selon la filière santé ou non
                blouse: false, // À ajuster selon la filière santé
                laptop: false,
                rame: true
            },
            'ISTMS': {
                polo: false,
                blouse: true,
                laptop: false,
                rame: false
            }
        };
        
        return configs[schoolCode] || { polo: false, blouse: false, laptop: false, rame: true };
    };

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                </div>
            </Container>
        );
    }

    if (!series) {
        return (
            <Container>
                <Alert variant="danger">Série non trouvée</Alert>
            </Container>
        );
    }

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>Étudiants - {series.schoolClass?.name}</h2>
                    <p className="text-muted mb-0">
                        {series.schoolClass?.level?.school?.name} • {series.schoolClass?.level?.name} • Série {series.name}
                    </p>
                </div>
                <Button variant="primary" onClick={handleCreateStudent}>
                    <PersonPlus className="me-2" />
                    Nouveau étudiant
                </Button>
            </div>

            {/* Informations de la série */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="h-100">
                        <Card.Body>
                            <h6 className="text-primary">Total étudiants</h6>
                            <h3 className="mb-0">{students.length}</h3>
                            <small className="text-muted">
                                Capacité max: {series.capacity || 'Non définie'}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="h-100">
                        <Card.Body>
                            <h6 className="text-success">Avec bourses</h6>
                            <h3 className="mb-0">
                                {students.filter(s => checkScholarshipEligibility(
                                    series?.schoolClass?.level?.school?.code,
                                    series?.schoolClass?.level?.level_type
                                )).length}
                            </h3>
                            <small className="text-muted">Étudiants éligibles</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="h-100">
                        <Card.Body>
                            <h6 className="text-info">Équipements requis</h6>
                            {getEquipmentBadges()}
                            <small className="text-muted d-block mt-2">
                                Selon {series?.schoolClass?.level?.school?.name}
                            </small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="h-100">
                        <Card.Body>
                            <h6 className="text-warning">Actions rapides</h6>
                            <div className="d-flex gap-1">
                                <Button variant="outline-primary" size="sm">
                                    Export
                                </Button>
                                <Button variant="outline-info" size="sm">
                                    Impression
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Liste des étudiants */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">Liste des étudiants</h5>
                </Card.Header>
                <Card.Body>
                    {students.length > 0 ? (
                        <Table responsive hover>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nom complet</th>
                                    <th>Matricule</th>
                                    <th>Genre</th>
                                    <th>Téléphone</th>
                                    <th>Niveau actuel</th>
                                    <th>Bourse</th>
                                    <th>Équipements</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, index) => (
                                    <tr key={student.id}>
                                        <td>{student.order || index + 1}</td>
                                        <td>
                                            <div>
                                                <strong>{student.first_name} {student.last_name}</strong>
                                                {student.bts_mention && (
                                                    <Badge bg="info" className="ms-2 small">
                                                        Mention: {student.bts_mention}
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-monospace">{student.student_id || student.registration_number}</td>
                                        <td>
                                            <Badge bg={student.gender === 'M' ? 'primary' : 'danger'}>
                                                {student.gender === 'M' ? 'Masculin' : 'Féminin'}
                                            </Badge>
                                        </td>
                                        <td>{student.phone_number || student.parent_phone}</td>
                                        <td>
                                            <Badge bg="outline-dark">
                                                Niveau {student.current_level || 1}
                                            </Badge>
                                        </td>
                                        <td>{getScholarshipBadge(student)}</td>
                                        <td>{getEquipmentBadges(student)}</td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <Button
                                                    variant="outline-info"
                                                    size="sm"
                                                    onClick={() => handleViewPayments(student)}
                                                    title="Voir les paiements"
                                                >
                                                    <CreditCard size={14} />
                                                </Button>
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    onClick={() => handleTransferStudent(student)}
                                                    title="Transférer l étudiant"
                                                >
                                                    <ArrowRightCircle size={14} />
                                                </Button>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleEditStudent(student)}
                                                    title="Modifier"
                                                >
                                                    <PencilSquare size={14} />
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDeleteStudent(student)}
                                                    title="Supprimer"
                                                >
                                                    <Trash size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert variant="info" className="text-center">
                            <PersonPlus size={48} className="mb-3 d-block mx-auto" />
                            <h5>Aucun étudiant dans cette série</h5>
                            <p className="mb-3">Commencez par ajouter des étudiants à cette série.</p>
                            <Button variant="primary" onClick={handleCreateStudent}>
                                Ajouter le premier étudiant
                            </Button>
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {/* Modal de création d étudiant */}
            <CreateStudentModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                seriesId={seriesId}
                series={series}
                onSuccess={() => {
                    setShowCreateModal(false);
                    loadStudents();
                }}
            />

            {/* Modal d édition d étudiant */}
            {selectedStudent && (
                <EditStudentModal
                    show={showEditModal}
                    onHide={() => {
                        setShowEditModal(false);
                        setSelectedStudent(null);
                    }}
                    student={selectedStudent}
                    series={series}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedStudent(null);
                        loadStudents();
                    }}
                />
            )}

            {/* Modal de transfert d étudiant */}
            {showTransferModal && studentToTransfer && (
                <StudentTransfer
                    student={studentToTransfer}
                    show={showTransferModal}
                    onHide={() => setShowTransferModal(false)}
                    onTransferSuccess={handleTransferSuccess}
                />
            )}
        </Container>
    );
};

// Composant pour créer un étudiant
const CreateStudentModal = ({ show, onHide, seriesId, series, onSuccess }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        place_of_birth: '',
        gender: 'M',
        phone_number: '',
        parent_phone: '',
        parent_name: '',
        address: '',
        current_level: 1,
        bts_mention: '',
        has_scholarship_enabled: true,
        notes: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [scholarshipPreview, setScholarshipPreview] = useState(null);

    useEffect(() => {
        if (show && series) {
            calculateScholarshipPreview();
        }
    }, [show, series, formData.current_level, formData.bts_mention]);

    const calculateScholarshipPreview = () => {
        if (!series?.schoolClass?.level?.school) return;
        
        const schoolCode = series.schoolClass.level.school.code;
        const levelType = series.schoolClass.level.level_type;
        const currentLevel = parseInt(formData.current_level) || 1;
        
        const isEligible = checkScholarshipEligibility(schoolCode, levelType);
        
        if (isEligible) {
            const amount = calculateScholarshipAmount(schoolCode, levelType, currentLevel, formData);
            const laptopIncluded = checkLaptopInScholarship(schoolCode, levelType, formData.bts_mention);
            
            setScholarshipPreview({
                eligible: true,
                amount,
                laptop_included: laptopIncluded,
                conditions: getScholarshipConditions(schoolCode, levelType)
            });
        } else {
            setScholarshipPreview({ eligible: false });
        }
    };

    const checkScholarshipEligibility = (schoolCode, levelType) => {
        const eligibilityRules = {
            'INSSAS': ['BTS', 'HND', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO', 'MASTER_PRO'],
            'ESGIT': ['LICENCE_PRO', 'INGENIERIE'],
            'ESSIT': ['INGENIERIE_SC'],
            'ISTPM': ['CQP', 'DQP']
        };
        
        return eligibilityRules[schoolCode]?.includes(levelType) || false;
    };

    const calculateScholarshipAmount = (schoolCode, levelType, currentLevel, studentData) => {
        switch (schoolCode) {
            case 'INSSAS':
                if (['BTS', 'HND'].includes(levelType)) {
                    return currentLevel === 1 ? 50000 : 100000;
                }
                if (levelType === 'DOUBLE_DIPLOMATION') {
                    return currentLevel === 1 ? 50000 : 100000;
                }
                if (levelType === 'LICENCE_PRO') {
                    return 100000;
                }
                if (levelType === 'MASTER_PRO') {
                    return currentLevel <= 2 ? 150000 : 0;
                }
                break;
                
            case 'ESGIT':
                if (levelType === 'LICENCE_PRO') {
                    const mention = studentData.bts_mention || 'passable';
                    const amounts = {
                        'passable': 50000,
                        'assez_bien': 100000,
                        'bien': 120000,
                        'tres_bien': 150000
                    };
                    return amounts[mention] || 50000;
                }
                if (levelType === 'INGENIERIE') {
                    return 50000;
                }
                break;
                
            case 'ESSIT':
                if (levelType === 'INGENIERIE_SC') {
                    return 50000;
                }
                break;
                
            case 'ISTPM':
                return 25000;
        }
        
        return 0;
    };

    const checkLaptopInScholarship = (schoolCode, levelType, btsMention) => {
        if (schoolCode === 'INSSAS' && levelType === 'DOUBLE_DIPLOMATION') return true;
        if (schoolCode === 'INSSAS' && levelType === 'LICENCE_PRO') return true;
        if (schoolCode === 'ESGIT' && levelType === 'LICENCE_PRO' && btsMention === 'tres_bien') return true;
        return false;
    };

    const getScholarshipConditions = (schoolCode, levelType) => {
        const conditions = {
            'INSSAS': {
                'BTS': 'Bourse automatique: 50k FCFA (niveau 1), 100k FCFA (niveaux 2+)',
                'DOUBLE_DIPLOMATION': 'Bourse automatique: 50k FCFA (niveau 1), 100k FCFA (niveaux 2+) + laptop',
                'LICENCE_PRO': 'Bourse fixe: 100k FCFA + laptop',
                'MASTER_PRO': 'Bourse: 150k FCFA (niveaux 1-2 seulement)'
            },
            'ESGIT': {
                'LICENCE_PRO': 'Bourse selon mention BTS obtenue',
                'INGENIERIE': 'Bourse fixe: 50k FCFA par an (3ème année)'
            }
        };
        
        return conditions[schoolCode]?.[levelType] || '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            
            const studentData = {
                ...formData,
                class_series_id: seriesId,
                current_level: parseInt(formData.current_level) || 1
            };

            const response = await secureApiEndpoints.students.create(studentData);
            
            if (response.success) {
                Swal.fire('Succès', 'Étudiant créé avec succès', 'success');
                onSuccess();
                resetForm();
            } else {
                let errorMessage = response.message || 'Erreur lors de la création';
                if (response.errors) {
                    const errorDetails = Object.values(response.errors).flat().join('<br>');
                    errorMessage += `<br><br><div style="text-align: left; font-size: 12px;">${errorDetails}</div>`;
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur de validation',
                    html: errorMessage,
                });
            }
        } catch (error) {
            console.error('Erreur création étudiant:', error);
            Swal.fire('Erreur', error.message || 'Une erreur inattendue est survenue.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            date_of_birth: '',
            place_of_birth: '',
            gender: 'M',
            phone_number: '',
            parent_phone: '',
            parent_name: '',
            address: '',
            current_level: 1,
            bts_mention: '',
            has_scholarship_enabled: true,
            notes: ''
        });
    };

    const needsBTSMention = () => {
        return series?.schoolClass?.level?.school?.code === 'ESGIT' && 
               series?.schoolClass?.level?.level_type === 'LICENCE_PRO';
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Créer un nouvel étudiant</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Prénom *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nom *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Date de naissance *</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formData.date_of_birth}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Lieu de naissance *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.place_of_birth}
                                    onChange={(e) => setFormData(prev => ({ ...prev, place_of_birth: e.target.value }))}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Niveau actuel *</Form.Label>
                                <Form.Select
                                    value={formData.current_level}
                                    onChange={(e) => setFormData(prev => ({ ...prev, current_level: e.target.value }))}
                                    required
                                >
                                    <option value={1}>Niveau 1</option>
                                    <option value={2}>Niveau 2</option>
                                    <option value={3}>Niveau 3</option>
                                    <option value={4}>Niveau 4</option>
                                    <option value={5}>Niveau 5</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Genre *</Form.Label>
                                <Form.Select
                                    value={formData.gender}
                                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                                    required
                                >
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        
                        {needsBTSMention() && (
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Mention BTS *</Form.Label>
                                    <Form.Select
                                        value={formData.bts_mention}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bts_mention: e.target.value }))}
                                        required
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="passable">Passable</option>
                                        <option value="assez_bien">Assez Bien</option>
                                        <option value="bien">Bien</option>
                                        <option value="tres_bien">Très Bien</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        )}
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Téléphone étudiant</Form.Label>
                                <Form.Control
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                                    placeholder="+237..."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Téléphone parent</Form.Label>
                                <Form.Control
                                    type="tel"
                                    value={formData.parent_phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, parent_phone: e.target.value }))}
                                    placeholder="+237..."
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Nom du parent/tuteur *</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.parent_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, parent_name: e.target.value }))}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Adresse</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        />
                    </Form.Group>

                    {scholarshipPreview && (
                        <Alert variant={scholarshipPreview.eligible ? 'success' : 'secondary'}>
                            <div className="d-flex align-items-center mb-2">
                                <Award className="me-2" />
                                <strong>Information sur les bourses et équipements</strong>
                            </div>
                            
                            {scholarshipPreview.eligible ? (
                                <div>
                                    <p className="mb-1">
                                        <strong>Bourse:</strong> {scholarshipPreview.amount?.toLocaleString()} FCFA
                                    </p>
                                    {scholarshipPreview.laptop_included && (
                                        <p className="mb-1">
                                            <Laptop className="me-1" />
                                            <strong>Laptop inclus dans la bourse</strong>
                                        </p>
                                    )}
                                    <small className="text-muted">{scholarshipPreview.conditions}</small>
                                </div>
                            ) : (
                                <p className="mb-0">Cet étudiant n est pas éligible aux bourses pour cette formation.</p>
                            )}
                        </Alert>
                    )}
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Annuler
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Création...' : 'Créer l étudiant'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

const EditStudentModal = ({ show, onHide, student, series, onSuccess }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        place_of_birth: '',
        gender: 'M',
        phone_number: '',
        parent_phone: '',
        parent_name: '',
        address: '',
        current_level: 1,
        bts_mention: '',
        has_scholarship_enabled: true,
        is_new: true,
        notes: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [scholarshipPreview, setScholarshipPreview] = useState(null);

    // Initialiser le formulaire avec les données de l étudiant
    useEffect(() => {
        if (show && student) {
            setFormData({
                first_name: student.first_name || '',
                last_name: student.last_name || '',
                date_of_birth: student.date_of_birth || '',
                place_of_birth: student.place_of_birth || '',
                gender: student.gender || 'M',
                phone_number: student.phone_number || '',
                parent_phone: student.parent_phone || '',
                parent_name: student.parent_name || '',
                address: student.address || '',
                current_level: student.current_level || 1,
                bts_mention: student.bts_mention || '',
                has_scholarship_enabled: student.has_scholarship_enabled !== false,
                is_new: student.is_new === null ? true : student.is_new,
                notes: student.notes || ''
            });
        }
    }, [show, student]);

    useEffect(() => {
        if (show && series && student) {
            calculateScholarshipPreview();
        }
    }, [show, series, student, formData.current_level, formData.bts_mention]);

    const calculateScholarshipPreview = () => {
        if (!series?.schoolClass?.level?.school) return;
        
        const schoolCode = series.schoolClass.level.school.code;
        const levelType = series.schoolClass.level.level_type;
        const currentLevel = parseInt(formData.current_level) || 1;
        
        const isEligible = checkScholarshipEligibility(schoolCode, levelType);
        
        if (isEligible) {
            const amount = calculateScholarshipAmount(schoolCode, levelType, currentLevel, formData);
            const laptopIncluded = checkLaptopInScholarship(schoolCode, levelType, formData.bts_mention);
            
            setScholarshipPreview({
                eligible: true,
                amount,
                laptop_included: laptopIncluded,
                conditions: getScholarshipConditions(schoolCode, levelType)
            });
        } else {
            setScholarshipPreview({ eligible: false });
        }
    };

    const checkScholarshipEligibility = (schoolCode, levelType) => {
        const eligibilityRules = {
            'INSSAS': ['BTS', 'HND', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO', 'MASTER_PRO'],
            'ESGIT': ['LICENCE_PRO', 'INGENIERIE'],
            'ESSIT': ['INGENIERIE_SC'],
            'ISTPM': ['CQP', 'DQP']
        };
        
        return eligibilityRules[schoolCode]?.includes(levelType) || false;
    };

    const calculateScholarshipAmount = (schoolCode, levelType, currentLevel, studentData) => {
        switch (schoolCode) {
            case 'INSSAS':
                if (['BTS', 'HND'].includes(levelType)) {
                    return currentLevel === 1 ? 50000 : 100000;
                }
                if (levelType === 'DOUBLE_DIPLOMATION') {
                    return currentLevel === 1 ? 50000 : 100000;
                }
                if (levelType === 'LICENCE_PRO') {
                    return 100000;
                }
                if (levelType === 'MASTER_PRO') {
                    return currentLevel <= 2 ? 150000 : 0;
                }
                break;
                
            case 'ESGIT':
                if (levelType === 'LICENCE_PRO') {
                    const mention = studentData.bts_mention || 'passable';
                    const amounts = {
                        'passable': 50000,
                        'assez_bien': 100000,
                        'bien': 120000,
                        'tres_bien': 150000
                    };
                    return amounts[mention] || 50000;
                }
                if (levelType === 'INGENIERIE') {
                    return 50000;
                }
                break;
                
            case 'ESSIT':
                if (levelType === 'INGENIERIE_SC') {
                    return 50000;
                }
                break;
                
            case 'ISTPM':
                return 25000;
        }
        
        return 0;
    };

    const checkLaptopInScholarship = (schoolCode, levelType, btsMention) => {
        if (schoolCode === 'INSSAS' && levelType === 'DOUBLE_DIPLOMATION') return true;
        if (schoolCode === 'INSSAS' && levelType === 'LICENCE_PRO') return true;
        if (schoolCode === 'ESGIT' && levelType === 'LICENCE_PRO' && btsMention === 'tres_bien') return true;
        return false;
    };

    const getScholarshipConditions = (schoolCode, levelType) => {
        const conditions = {
            'INSSAS': {
                'BTS': 'Bourse automatique: 50k FCFA (niveau 1), 100k FCFA (niveaux 2+)',
                'DOUBLE_DIPLOMATION': 'Bourse automatique: 50k FCFA (niveau 1), 100k FCFA (niveaux 2+) + laptop',
                'LICENCE_PRO': 'Bourse fixe: 100k FCFA + laptop',
                'MASTER_PRO': 'Bourse: 150k FCFA (niveaux 1-2 seulement)'
            },
            'ESGIT': {
                'LICENCE_PRO': 'Bourse selon mention BTS obtenue',
                'INGENIERIE': 'Bourse fixe: 50k FCFA par an (3ème année)'
            }
        };
        
        return conditions[schoolCode]?.[levelType] || '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            Swal.fire('Erreur', 'Le prénom et le nom sont requis', 'error');
            return;
        }

        try {
            setLoading(true);
            
            const updatedData = {
                ...formData,
                current_level: parseInt(formData.current_level) || 1
            };

            const response = await secureApiEndpoints.students.update(student.id, updatedData);
            
            if (response.success) {
                Swal.fire('Succès', 'Étudiant modifié avec succès', 'success');
                onSuccess();
            } else {
                Swal.fire('Erreur', response.message || 'Erreur lors de la modification', 'error');
            }
        } catch (error) {
            console.error('Erreur modification étudiant:', error);
            Swal.fire('Erreur', 'Erreur lors de la modification de l étudiant', 'error');
        } finally {
            setLoading(false);
        }
    };

    const needsBTSMention = () => {
        return series?.schoolClass?.level?.school?.code === 'ESGIT' && 
               series?.schoolClass?.level?.level_type === 'LICENCE_PRO';
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!student) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    Modifier l étudiant - {student.first_name} {student.last_name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Prénom *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Nom *</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Date de naissance</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formData.date_of_birth}
                                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Lieu de naissance</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.place_of_birth}
                                    onChange={(e) => handleInputChange('place_of_birth', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Genre</Form.Label>
                                <Form.Select
                                    value={formData.gender}
                                    onChange={(e) => handleInputChange('gender', e.target.value)}>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Niveau actuel *</Form.Label>
                                <Form.Select
                                    value={formData.current_level}
                                    onChange={(e) => handleInputChange('current_level', e.target.value)}
                                    required
                                >
                                    <option value={1}>Niveau 1</option>
                                    <option value={2}>Niveau 2</option>
                                    <option value={3}>Niveau 3</option>
                                    <option value={4}>Niveau 4</option>
                                    <option value={5}>Niveau 5</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    {series?.schoolClass?.level?.order > 1 && (
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="switch"
                                id="is-new-switch"
                                label="Nouvel étudiant cette année"
                                checked={formData.is_new}
                                onChange={(e) => handleInputChange('is_new', e.target.checked)}
                            />
                            <Form.Text className="text-muted">
                                Un nouvel étudiant paie les frais de dossier, même en année supérieure. Décochez si c'est un ancien étudiant qui se réinscrit.
                            </Form.Text>
                        </Form.Group>
                    )}
                        
                    {needsBTSMention() && (
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Mention BTS obtenue *</Form.Label>
                                    <Form.Select
                                        value={formData.bts_mention}
                                        onChange={(e) => handleInputChange('bts_mention', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner une mention</option>
                                        <option value="passable">Passable</option>
                                        <option value="assez_bien">Assez Bien</option>
                                        <option value="bien">Bien</option>
                                        <option value="tres_bien">Très Bien</option>
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Cette mention détermine le montant de la bourse pour ESGIT Licence Pro
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Téléphone étudiant</Form.Label>
                                <Form.Control
                                    type="tel"
                                    value={formData.phone_number}
                                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                                    placeholder="+237..."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Téléphone parent</Form.Label>
                                <Form.Control
                                    type="tel"
                                    value={formData.parent_phone}
                                    onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                                    placeholder="+237..."
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Nom du parent/tuteur</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.parent_name}
                            onChange={(e) => handleInputChange('parent_name', e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Adresse</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            label="Bourse activée"
                            checked={formData.has_scholarship_enabled}
                            onChange={(e) => setFormData({...formData, has_scholarship_enabled: e.target.checked})}
                        />
                        <Form.Text className="text-muted">
                            Décochez pour désactiver temporairement la bourse pour cet étudiant
                        </Form.Text>
                    </Form.Group>

                    {scholarshipPreview && (
                        <Alert variant={scholarshipPreview.eligible ? 'success' : 'secondary'}>
                            <div className="d-flex align-items-center mb-2">
                                <Award className="me-2" />
                                <strong>Information sur les bourses et équipements</strong>
                            </div>
                            
                            {scholarshipPreview.eligible ? (
                                <div>
                                    <p className="mb-1">
                                        <strong>Bourse:</strong> {scholarshipPreview.amount?.toLocaleString()} FCFA
                                        {!formData.has_scholarship_enabled && (
                                            <Badge bg="warning" className="ms-2">Désactivée</Badge>
                                        )}
                                    </p>
                                    {scholarshipPreview.laptop_included && (
                                        <p className="mb-1">
                                            <Laptop className="me-1" />
                                            <strong>Laptop inclus dans la bourse</strong>
                                        </p>
                                    )}
                                    <small className="text-muted">{scholarshipPreview.conditions}</small>
                                </div>
                            ) : (
                                <p className="mb-0">Cet étudiant n est pas éligible aux bourses pour cette formation.</p>
                            )}
                        </Alert>
                    )}

                    {/* Informations sur l étudiant existant */}
                    <Alert variant="info">
                        <div className="d-flex align-items-center mb-2">
                            <Eye className="me-2" />
                            <strong>Informations actuelles</strong>
                        </div>
                        <Row>
                            <Col md={6}>
                                <small className="text-muted">
                                    <strong>Matricule:</strong> {student.student_id || student.registration_number || 'Non défini'}
                                </small>
                            </Col>
                            <Col md={6}>
                                <small className="text-muted">
                                    <strong>Créé le:</strong> {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Non défini'}
                                </small>
                            </Col>
                        </Row>
                        {student.updated_at && (
                            <Row className="mt-1">
                                <Col md={12}>
                                    <small className="text-muted">
                                        <strong>Dernière modification:</strong> {new Date(student.updated_at).toLocaleDateString()}
                                    </small>
                                </Col>
                            </Row>
                        )}
                    </Alert>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={loading}>
                    Annuler
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Modification...
                        </>
                    ) : (
                        'Sauvegarder les modifications'
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default SeriesStudents;
