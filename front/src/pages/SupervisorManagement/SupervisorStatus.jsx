import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Alert, Spinner, Badge, Table
} from 'react-bootstrap';
import { 
  PersonCheck, Building, CheckCircleFill, InfoCircleFill
} from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { secureApiEndpoints } from '../../utils/apiMigration';

const SupervisorStatus = () => {
  const [supervisors, setSupervisors] = useState([]);
  const [totalClasses, setTotalClasses] = useState('Chargement...');
  const [totalStudents, setTotalStudents] = useState('Chargement...');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { token, user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadSupervisors(),
        loadSchoolStats()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupervisors = async () => {
    try {
      if (user && user.role === 'surveillant_general') {
        // Afficher seulement l'utilisateur connecté
        setSupervisors([user]);
      } else if (user && user.role === 'admin') {
        // Essayer de charger tous les surveillants (accès admin)
        try {
          const response = await secureApiEndpoints.userManagement.getAll();
          if (response.success) {
            const supervisorUsers = response.data.filter(supervisor => supervisor.role === 'surveillant_general');
            setSupervisors(supervisorUsers);
          }
        } catch (adminError) {
          console.error('Erreur lors du chargement depuis l\'API admin:', adminError);
          setSupervisors([]);
        }
      } else {
        setSupervisors([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des surveillants:', error);
      setMessage('Informations sur les surveillants non disponibles');
      setMessageType('info');
    }
  };

  const loadSchoolStats = async () => {
    try {
      // Pour un surveillant général, on affiche simplement des indicateurs génériques
      // car il a accès à toutes les classes et tous les étudiants
      setTotalClasses('Toutes');
      setTotalStudents('Tous');

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      // En cas d'erreur, afficher des valeurs par défaut
      setTotalClasses('Toutes');
      setTotalStudents('Tous');
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge bg="success">
        <CheckCircleFill className="me-1" size={12} />
        Actif
      </Badge>
    ) : (
      <Badge bg="secondary">
        Inactif
      </Badge>
    );
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-3">
            <PersonCheck size={32} className="text-primary me-3" />
            <div>
              <h2 className="mb-0">Gestion des Surveillants Généraux</h2>
              <p className="text-muted mb-0">Statut et permissions des surveillants généraux</p>
            </div>
          </div>
        </Col>
      </Row>

      {message && (
        <Alert variant={messageType} dismissible onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {/* Information Card */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-info bg-opacity-10 border-info">
            <Card.Body>
              <div className="d-flex align-items-start">
                <InfoCircleFill className="text-info me-3 mt-1" size={20} />
                <div>
                  <h5 className="text-info mb-2">Nouvelle Logique des Surveillants Généraux</h5>
                  <p className="mb-0">
                    Les surveillants généraux ont maintenant automatiquement accès à <strong>tous les élèves de l'établissement</strong>, 
                    sans nécessité d'affectation spécifique à une classe. Cette approche simplifie la gestion et correspond 
                    mieux au rôle de surveillance générale.
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <PersonCheck size={48} className="text-primary mb-3" />
              <h3 className="text-primary">{supervisors.length}</h3>
              <p className="text-muted mb-0">Surveillants Généraux</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <Building size={48} className="text-success mb-3" />
              <h3 className="text-success">{totalClasses}</h3>
              <p className="text-muted mb-0">Classes Accessibles</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <CheckCircleFill size={48} className="text-info mb-3" />
              <h3 className="text-info">{totalStudents}</h3>
              <p className="text-muted mb-0">Élèves sous Surveillance</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Supervisors List */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <PersonCheck className="me-2" />
            Liste des Surveillants Généraux
          </h5>
        </Card.Header>
        <Card.Body>
          {isLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Chargement...</span>
              </Spinner>
            </div>
          ) : supervisors.length === 0 ? (
            <Alert variant="info" className="mb-0">
              <InfoCircleFill className="me-2" />
              Aucun surveillant général trouvé dans le système.
            </Alert>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Nom Complet</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Statut</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map(supervisor => (
                  <tr key={supervisor.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <PersonCheck className="text-primary me-2" size={16} />
                        <strong>{supervisor.name}</strong>
                      </div>
                    </td>
                    <td>{supervisor.email}</td>
                    <td>{supervisor.contact || '-'}</td>
                    <td>{getStatusBadge(supervisor.is_active)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <Badge bg="success" className="small">
                          Toutes les classes
                        </Badge>
                        <Badge bg="primary" className="small">
                          Tous les élèves
                        </Badge>
                        <Badge bg="info" className="small">
                          Scanner QR
                        </Badge>
                        <Badge bg="warning" className="small">
                          Marquer absences
                        </Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Permissions Details */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Permissions des Surveillants Généraux</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6 className="text-success">✅ Permissions Accordées</h6>
                  <ul className="list-unstyled">
                    <li>• Scanner les codes QR de tous les élèves</li>
                    <li>• Marquer les présences pour toutes les classes</li>
                    <li>• Marquer les absences pour toutes les classes</li>
                    <li>• Consulter les rapports de présence globaux</li>
                    <li>• Accéder aux données de tous les élèves actifs</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6 className="text-info">ℹ️ Changements Apportés</h6>
                  <ul className="list-unstyled">
                    <li>• Suppression du système d'affectation par classe</li>
                    <li>• Accès automatique à toutes les classes</li>
                    <li>• Simplification de la gestion des permissions</li>
                    <li>• Logique uniforme pour tous les surveillants généraux</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SupervisorStatus;