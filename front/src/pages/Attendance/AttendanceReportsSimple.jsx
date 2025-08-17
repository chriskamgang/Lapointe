import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Form, Button, Table, Badge, 
  Alert, Spinner, InputGroup
} from 'react-bootstrap';
import { 
  Calendar, Search, Filter, Download, Printer, 
  CheckCircleFill, XCircleFill, People, Clock,
  FileEarmarkText, CalendarRange
} from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { host } from '../../utils/fetch';

const AttendanceReportsSimple = () => {
  const [attendances, setAttendances] = useState([]);
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'all', // all, present, absent
    searchTerm: ''
  });

  const [summary, setSummary] = useState({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    presentPercentage: 0
  });

  const { user, token } = useAuth();

  useEffect(() => {
    loadMockData();
  }, []);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadAttendances();
    }
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    filterAndSummarizeAttendances();
  }, [attendances, filters.status, filters.searchTerm]);

  const loadMockData = () => {
    // Données de démonstration
    const mockAttendances = [
      {
        id: 1,
        student: { full_name: 'Jean Dupont' },
        school_class: { name: 'CP' },
        attendance_date: new Date().toISOString().split('T')[0],
        scanned_at: '08:15:00',
        is_present: true,
        supervisor: { name: 'M. Surveillant' }
      },
      {
        id: 2,
        student: { full_name: 'Marie Martin' },
        school_class: { name: 'CP' },
        attendance_date: new Date().toISOString().split('T')[0],
        scanned_at: '08:20:00',
        is_present: true,
        supervisor: { name: 'M. Surveillant' }
      },
      {
        id: 3,
        student: { full_name: 'Pierre Durand' },
        school_class: { name: 'CE1' },
        attendance_date: new Date().toISOString().split('T')[0],
        scanned_at: '08:25:00',
        is_present: true,
        supervisor: { name: 'M. Surveillant' }
      }
    ];
    
    setAttendances(mockAttendances);
    setMessage('Données de démonstration chargées');
    setMessageType('info');
  };

  const loadAttendances = async () => {
    if (!filters.startDate || !filters.endDate || !user || !token) return;

    try {
      setIsLoading(true);
      setMessage('');
      
      // Tentative d'appel API réel
      const params = new URLSearchParams({
        supervisor_id: user.id,
        start_date: filters.startDate,
        end_date: filters.endDate
      });

      const response = await fetch(`${host}/api/supervisors/attendance-range?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttendances(data.data.attendances || []);
          setMessage('Données chargées avec succès');
          setMessageType('success');
        } else {
          throw new Error(data.message || 'Erreur API');
        }
      } else {
        throw new Error('Erreur de connexion au serveur');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setMessage(`Mode démo: ${error.message}. Utilisation des données de test.`);
      setMessageType('warning');
      loadMockData(); // Fallback vers les données mock
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSummarizeAttendances = () => {
    let filtered = [...attendances];

    // Filter by status
    if (filters.status === 'present') {
      filtered = filtered.filter(att => att.is_present);
    } else if (filters.status === 'absent') {
      filtered = filtered.filter(att => !att.is_present);
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(att => 
        att.student?.full_name?.toLowerCase().includes(searchLower) ||
        att.school_class?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAttendances(filtered);

    // Calculate summary
    const totalStudents = attendances.length;
    const presentCount = attendances.filter(att => att.is_present).length;
    const absentCount = totalStudents - presentCount;
    const presentPercentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;

    setSummary({
      totalStudents,
      presentCount,
      absentCount,
      presentPercentage
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: 'all',
      searchTerm: ''
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToPDF = () => {
    setMessage('Fonction d\'export PDF en cours de développement');
    setMessageType('info');
    setTimeout(() => setMessage(''), 3000);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">
            <FileEarmarkText className="me-2" />
            Rapports de Présences
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

      {/* Filters Section */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <Filter className="me-2" />
                Filtres de Recherche
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date de début</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date de fin</Form.Label>
                    <Form.Control
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Statut</Form.Label>
                    <Form.Select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="all">Tous</option>
                      <option value="present">Présents seulement</option>
                      <option value="absent">Absents seulement</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Rechercher un élève</Form.Label>
                    <InputGroup>
                      <InputGroup.Text>
                        <Search />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Nom de l'élève..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col className="d-flex gap-2">
                  <Button variant="outline-secondary" onClick={resetFilters}>
                    Réinitialiser
                  </Button>
                  <Button variant="primary" onClick={loadAttendances} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Chargement...
                      </>
                    ) : (
                      'Actualiser'
                    )}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Summary Section */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-primary">
            <Card.Body>
              <People size={32} className="text-primary mb-2" />
              <h4 className="mb-0">{summary.totalStudents}</h4>
              <small className="text-muted">Total Enregistrements</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-success">
            <Card.Body>
              <CheckCircleFill size={32} className="text-success mb-2" />
              <h4 className="mb-0">{summary.presentCount}</h4>
              <small className="text-muted">Présents</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-danger">
            <Card.Body>
              <XCircleFill size={32} className="text-danger mb-2" />
              <h4 className="mb-0">{summary.absentCount}</h4>
              <small className="text-muted">Absents</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-info">
            <Card.Body>
              <CalendarRange size={32} className="text-info mb-2" />
              <h4 className="mb-0">{summary.presentPercentage}%</h4>
              <small className="text-muted">Taux de Présence</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Actions */}
      <Row className="mb-3">
        <Col className="d-flex justify-content-end gap-2">
          <Button variant="outline-primary" onClick={printReport}>
            <Printer className="me-2" />
            Imprimer
          </Button>
          <Button variant="outline-success" onClick={exportToPDF}>
            <Download className="me-2" />
            Exporter PDF
          </Button>
        </Col>
      </Row>

      {/* Results Table */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <Calendar className="me-2" />
                Résultats
                <Badge bg="secondary" className="ms-2">
                  {filteredAttendances.length}
                </Badge>
              </h5>
            </Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-4">
                  <Spinner />
                  <p className="mt-2 text-muted">Chargement en cours...</p>
                </div>
              ) : filteredAttendances.length > 0 ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Heure</th>
                        <th>Statut</th>
                        <th>Superviseur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendances.map((attendance, index) => (
                        <tr key={index}>
                          <td>{formatDate(attendance.attendance_date)}</td>
                          <td>
                            <strong>{attendance.student?.full_name || 'N/A'}</strong>
                          </td>
                          <td>
                            <Badge bg="light" text="dark">
                              {attendance.school_class?.name || 'N/A'}
                            </Badge>
                          </td>
                          <td>
                            <Clock size={14} className="me-1" />
                            {formatTime(attendance.scanned_at)}
                          </td>
                          <td>
                            <Badge bg={attendance.is_present ? 'success' : 'danger'}>
                              {attendance.is_present ? (
                                <>
                                  <CheckCircleFill size={12} className="me-1" />
                                  Présent
                                </>
                              ) : (
                                <>
                                  <XCircleFill size={12} className="me-1" />
                                  Absent
                                </>
                              )}
                            </Badge>
                          </td>
                          <td>
                            <small className="text-muted">
                              {attendance.supervisor?.name || user?.name || 'N/A'}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <Calendar size={48} />
                  <p className="mt-2 mb-0">
                    {attendances.length === 0 
                      ? 'Aucune donnée de présence pour la période sélectionnée'
                      : 'Aucun résultat ne correspond aux filtres appliqués'
                    }
                  </p>
                  <small>Utilisez le bouton "Actualiser" pour recharger les données</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AttendanceReportsSimple;