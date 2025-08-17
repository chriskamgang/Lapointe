import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Form, Button, Table, Badge, 
  Alert, Spinner, Modal 
} from 'react-bootstrap';
import { 
  PeopleFill, Plus, Trash, CheckCircleFill, 
  XCircleFill, PersonCheck, Building
} from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { host } from '../../utils/fetch';

const SupervisorAssignments = () => {
  const [supervisors, setSupervisors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [newAssignment, setNewAssignment] = useState({
    supervisor_id: '',
    school_class_id: '',
    school_year_id: ''
  });

  const { token } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadSupervisors(),
        loadClasses(),
        loadSchoolYears(),
        loadAssignments()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupervisors = async () => {
    try {
      // Le token est déjà disponible depuis useAuth
      const response = await fetch(`${host}/api/user-management`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        const supervisorUsers = data.data.users.filter(user => user.role === 'surveillant_general');
        setSupervisors(supervisorUsers);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des surveillants:', error);
    }
  };

  const loadClasses = async () => {
    try {
      // Le token est déjà disponible depuis useAuth
      const response = await fetch(host+'/api/school-classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des classes:', error);
    }
  };

  const loadSchoolYears = async () => {
    try {
      // Le token est déjà disponible depuis useAuth
      const response = await fetch(host+'/api/school-years', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setSchoolYears(data.data || []);
        // Set current active year as default
        const activeYear = data.data.find(year => year.is_active);
        if (activeYear) {
          setNewAssignment(prev => ({ ...prev, school_year_id: activeYear.id }));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des années scolaires:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      // Le token est déjà disponible depuis useAuth
      const response = await fetch(host+'/api/supervisors/all-assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setAssignments(data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des affectations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newAssignment.supervisor_id || !newAssignment.school_class_id || !newAssignment.school_year_id) {
      setMessage('Veuillez remplir tous les champs');
      setMessageType('danger');
      return;
    }

    try {
      setIsLoading(true);
      // Le token est déjà disponible depuis useAuth
      const response = await fetch(host+'/api/supervisors/assign-to-class', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAssignment)
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Affectation créée avec succès');
        setMessageType('success');
        setShowModal(false);
        setNewAssignment({
          supervisor_id: '',
          school_class_id: '',
          school_year_id: schoolYears.find(y => y.is_active)?.id || ''
        });
        loadAssignments();
      } else {
        setMessage(data.message || 'Erreur lors de la création');
        setMessageType('danger');
      }
    } catch (error) {
      setMessage('Erreur lors de la création de l\'affectation');
      setMessageType('danger');
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette affectation ?')) {
      return;
    }

    try {
      // Le token est déjà disponible depuis useAuth
      const response = await fetch(`${host}/api/supervisors/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Affectation supprimée avec succès');
        setMessageType('success');
        loadAssignments();
      } else {
        setMessage(data.message || 'Erreur lors de la suppression');
        setMessageType('danger');
      }
    } catch (error) {
      setMessage('Erreur lors de la suppression');
      setMessageType('danger');
      console.error('Erreur:', error);
    }
  };

  const getSupervisorName = (supervisorId) => {
    const supervisor = supervisors.find(s => s.id === supervisorId);
    return supervisor ? supervisor.name : 'Inconnu';
  };

  const getClassName = (classId) => {
    const schoolClass = classes.find(c => c.id === classId);
    return schoolClass ? schoolClass.name : 'Inconnue';
  };

  const getSchoolYearName = (yearId) => {
    const year = schoolYears.find(y => y.id === yearId);
    return year ? year.year_name : 'Inconnue';
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">
            <PersonCheck className="me-2" />
            Affectations des Surveillants
          </h2>
        </Col>
      </Row>

      {message && (
        <Row className="mb-3">
          <Col>
            <Alert variant={messageType} onClose={() => setMessage('')} dismissible>
              {message}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Add Assignment Button */}
      <Row className="mb-4">
        <Col className="d-flex justify-content-end">
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="me-2" />
            Nouvelle Affectation
          </Button>
        </Col>
      </Row>

      {/* Assignments Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <Building className="me-2" />
                Affectations Actuelles
                <Badge bg="secondary" className="ms-2">
                  {assignments.length}
                </Badge>
              </h5>
            </Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-4">
                  <Spinner />
                  <p className="mt-2 text-muted">Chargement...</p>
                </div>
              ) : assignments.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Surveillant</th>
                        <th>Classe</th>
                        <th>Année Scolaire</th>
                        <th>Statut</th>
                        <th>Date de Création</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td>
                            <strong>{getSupervisorName(assignment.supervisor_id)}</strong>
                          </td>
                          <td>
                            <Badge bg="info" text="dark">
                              {getClassName(assignment.school_class_id)}
                            </Badge>
                          </td>
                          <td>{getSchoolYearName(assignment.school_year_id)}</td>
                          <td>
                            <Badge bg={assignment.is_active ? 'success' : 'secondary'}>
                              {assignment.is_active ? (
                                <>
                                  <CheckCircleFill size={12} className="me-1" />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <XCircleFill size={12} className="me-1" />
                                  Inactif
                                </>
                              )}
                            </Badge>
                          </td>
                          <td>
                            {new Date(assignment.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => deleteAssignment(assignment.id)}
                            >
                              <Trash size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <PersonCheck size={48} />
                  <p className="mt-2 mb-0">Aucune affectation trouvée</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Assignment Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Plus className="me-2" />
            Nouvelle Affectation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Surveillant Général</Form.Label>
                  <Form.Select
                    value={newAssignment.supervisor_id}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, supervisor_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionnez un surveillant</option>
                    {supervisors.map(supervisor => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name} ({supervisor.username})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Classe</Form.Label>
                  <Form.Select
                    value={newAssignment.school_class_id}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, school_class_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionnez une classe</option>
                    {classes.map(schoolClass => (
                      <option key={schoolClass.id} value={schoolClass.id}>
                        {schoolClass.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Année Scolaire</Form.Label>
                  <Form.Select
                    value={newAssignment.school_year_id}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, school_year_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionnez une année</option>
                    {schoolYears.map(year => (
                      <option key={year.id} value={year.id}>
                        {year.year_name} {year.is_active && '(Active)'}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Création...
              </>
            ) : (
              <>
                <Plus className="me-2" />
                Créer l'Affectation
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SupervisorAssignments;