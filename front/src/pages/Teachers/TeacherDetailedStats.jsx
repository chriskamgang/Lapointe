/**
 * Statistiques détaillées d'un enseignant individuel
 * Affichage complet des heures de travail, mouvements et analyses
 */

import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Table,
    Badge,
    Form,
    Button,
    Modal,
    Spinner,
    Alert,
    ProgressBar,
    ListGroup,
    Tabs,
    Tab
} from 'react-bootstrap';
import {
    PersonCheck,
    Clock,
    Calendar,
    BarChart,
    ArrowRightCircle,
    ArrowLeftCircle,
    TrendingUp,
    TrendingDown,
    Eye,
    Download,
    Filter,
    CheckCircleFill,
    XCircleFill,
    ClockHistory,
    Activity
} from 'react-bootstrap-icons';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../../hooks/useAuth';
import { secureApiEndpoints } from '../../utils/apiMigration';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Enregistrement des composants Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const TeacherDetailedStats = () => {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
    const [endDate, setEndDate] = useState(new Date());
    const [detailedStats, setDetailedStats] = useState(null);
    const [dayMovements, setDayMovements] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMovementsModal, setShowMovementsModal] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const { user } = useAuth();

    useEffect(() => {
        loadTeachers();
    }, []);

    useEffect(() => {
        if (selectedTeacher) {
            loadDetailedStats();
        }
    }, [selectedTeacher, startDate, endDate]);

    const loadTeachers = async () => {
        try {
            const response = await secureApiEndpoints.teacherAttendance.getTeachersWithQR();
            if (response.success) {
                setTeachers(response.data.teachers || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des enseignants:', error);
        }
    };

    const loadDetailedStats = async () => {
        if (!selectedTeacher) return;

        try {
            setIsLoading(true);
            const response = await secureApiEndpoints.teacherAttendance.getDetailedTeacherStats(selectedTeacher, {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });

            if (response.success) {
                setDetailedStats(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDayMovements = async (date) => {
        try {
            const response = await secureApiEndpoints.teacherAttendance.getDayMovements(selectedTeacher, {
                date: date
            });

            if (response.success) {
                setDayMovements(response.data);
                setSelectedDate(date);
                setShowMovementsModal(true);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des mouvements:', error);
        }
    };

    // Configuration des graphiques
    const getWorkHoursChartData = () => {
        if (!detailedStats?.daily_details) return null;

        const last14Days = detailedStats.daily_details.slice(-14);
        
        return {
            labels: last14Days.map(day => new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
            datasets: [
                {
                    label: 'Heures travaillées',
                    data: last14Days.map(day => day.work_hours || 0),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Heures attendues',
                    data: last14Days.map(day => day.expected_hours || 8),
                    backgroundColor: 'rgba(156, 163, 175, 0.3)',
                    borderColor: 'rgba(156, 163, 175, 1)',
                    borderWidth: 1,
                    borderDash: [5, 5]
                }
            ]
        };
    };

    const getWeekdayAnalysisData = () => {
        if (!detailedStats?.weekday_analysis) return null;

        const weekdays = Object.keys(detailedStats.weekday_analysis);
        const attendanceRates = weekdays.map(day => {
            const stats = detailedStats.weekday_analysis[day];
            return stats.total_days > 0 ? (stats.present_days / stats.total_days) * 100 : 0;
        });

        return {
            labels: weekdays,
            datasets: [
                {
                    label: 'Taux de présence (%)',
                    data: attendanceRates,
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }
            ]
        };
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    const getPunctualityBadge = (status) => {
        switch (status) {
            case 'punctual':
                return <Badge bg="success">Ponctuel</Badge>;
            case 'late':
                return <Badge bg="warning">En retard</Badge>;
            case 'early_departure':
                return <Badge bg="info">Départ anticipé</Badge>;
            case 'late_and_early':
                return <Badge bg="danger">Retard + Départ</Badge>;
            default:
                return <Badge bg="secondary">-</Badge>;
        }
    };

    const formatDuration = (minutes) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
    };

    const selectedTeacherData = teachers.find(t => t.id === parseInt(selectedTeacher));

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>
                                <Activity className="me-2" />
                                Statistiques Détaillées Enseignant
                            </h2>
                            <p className="text-muted mb-0">
                                Analyse complète des heures et mouvements
                            </p>
                        </div>
                        
                        <Button variant="outline-primary" onClick={() => window.print()}>
                            <Download className="me-1" />
                            Imprimer
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Filtres */}
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Header>
                            <Filter className="me-2" />
                            Sélection et période
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Enseignant</Form.Label>
                                        <Form.Select 
                                            value={selectedTeacher} 
                                            onChange={(e) => setSelectedTeacher(e.target.value)}
                                        >
                                            <option value="">Sélectionner un enseignant</option>
                                            {teachers.map(teacher => (
                                                <option key={teacher.id} value={teacher.id}>
                                                    {teacher.full_name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Date de début</Form.Label>
                                        <DatePicker
                                            selected={startDate}
                                            onChange={setStartDate}
                                            className="form-control"
                                            dateFormat="dd/MM/yyyy"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Date de fin</Form.Label>
                                        <DatePicker
                                            selected={endDate}
                                            onChange={setEndDate}
                                            className="form-control"
                                            dateFormat="dd/MM/yyyy"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2} className="d-flex align-items-end">
                                    <Button 
                                        variant="primary"
                                        onClick={loadDetailedStats}
                                        disabled={!selectedTeacher || isLoading}
                                        className="mb-3"
                                    >
                                        Analyser
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Contenu principal */}
            {detailedStats && selectedTeacherData ? (
                <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                    {/* Onglet Vue d'ensemble */}
                    <Tab eventKey="overview" title="Vue d'ensemble">
                        <Row className="mb-4">
                            {/* Informations enseignant */}
                            <Col md={4}>
                                <Card>
                                    <Card.Header>
                                        <PersonCheck className="me-2" />
                                        Informations Enseignant
                                    </Card.Header>
                                    <Card.Body>
                                        <h5>{selectedTeacherData.full_name}</h5>
                                        <p className="text-muted mb-2">{selectedTeacherData.email}</p>
                                        <hr />
                                        <p className="mb-1">
                                            <strong>Horaires:</strong> {selectedTeacherData.expected_arrival_time || '08:00'} - {selectedTeacherData.expected_departure_time || '17:00'}
                                        </p>
                                        <p className="mb-1">
                                            <strong>Heures/jour:</strong> {selectedTeacherData.daily_work_hours || 8}h
                                        </p>
                                        <p className="mb-0">
                                            <strong>Période:</strong> {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                                        </p>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* Statistiques résumées */}
                            <Col md={8}>
                                <Card>
                                    <Card.Header>
                                        <BarChart className="me-2" />
                                        Statistiques de la période
                                    </Card.Header>
                                    <Card.Body>
                                        <Row>
                                            <Col md={3} className="text-center">
                                                <h4 className="text-success">{detailedStats.summary_stats.present_days}</h4>
                                                <small className="text-muted">Jours présents</small>
                                            </Col>
                                            <Col md={3} className="text-center">
                                                <h4 className="text-danger">{detailedStats.summary_stats.absent_days}</h4>
                                                <small className="text-muted">Jours absents</small>
                                            </Col>
                                            <Col md={3} className="text-center">
                                                <h4 className="text-info">{detailedStats.summary_stats.total_work_hours}h</h4>
                                                <small className="text-muted">Heures travaillées</small>
                                            </Col>
                                            <Col md={3} className="text-center">
                                                <h4 className="text-warning">{detailedStats.summary_stats.average_work_hours}h</h4>
                                                <small className="text-muted">Moyenne/jour</small>
                                            </Col>
                                        </Row>
                                        <hr />
                                        <Row>
                                            <Col md={6}>
                                                <div className="text-center">
                                                    <h5 className="text-primary">{detailedStats.summary_stats.attendance_rate}%</h5>
                                                    <small className="text-muted">Taux de présence</small>
                                                    <ProgressBar 
                                                        now={detailedStats.summary_stats.attendance_rate} 
                                                        variant={detailedStats.summary_stats.attendance_rate >= 90 ? 'success' : detailedStats.summary_stats.attendance_rate >= 70 ? 'warning' : 'danger'}
                                                        className="mt-2"
                                                    />
                                                </div>
                                            </Col>
                                            <Col md={6}>
                                                <div className="text-center">
                                                    <h5 className="text-info">{detailedStats.summary_stats.total_movements}</h5>
                                                    <small className="text-muted">Total mouvements</small>
                                                    <div className="mt-2">
                                                        <small className="text-muted">
                                                            Retard moyen: {detailedStats.summary_stats.average_late_minutes} min
                                                        </small>
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Graphiques */}
                        <Row className="mb-4">
                            <Col md={8}>
                                <Card>
                                    <Card.Header>Heures de travail quotidiennes</Card.Header>
                                    <Card.Body>
                                        {getWorkHoursChartData() && (
                                            <Bar data={getWorkHoursChartData()} options={chartOptions} />
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card>
                                    <Card.Header>Analyse par jour de semaine</Card.Header>
                                    <Card.Body>
                                        {getWeekdayAnalysisData() && (
                                            <Doughnut data={getWeekdayAnalysisData()} />
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Tab>

                    {/* Onglet Détails quotidiens */}
                    <Tab eventKey="daily" title="Détails quotidiens">
                        <Card>
                            <Card.Header>
                                <Calendar className="me-2" />
                                Détails par jour
                            </Card.Header>
                            <Card.Body>
                                {isLoading ? (
                                    <div className="text-center py-4">
                                        <Spinner animation="border" />
                                    </div>
                                ) : (
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Présence</th>
                                                <th>Heure d'arrivée</th>
                                                <th>Heure de départ</th>
                                                <th>Heures travaillées</th>
                                                <th>Retard</th>
                                                <th>Ponctualité</th>
                                                <th>Mouvements</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailedStats.daily_details.map((day, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        {new Date(day.date).toLocaleDateString('fr-FR', { 
                                                            weekday: 'short', 
                                                            day: 'numeric', 
                                                            month: 'short' 
                                                        })}
                                                    </td>
                                                    <td>
                                                        {day.is_present ? (
                                                            <Badge bg="success"><CheckCircleFill /></Badge>
                                                        ) : (
                                                            <Badge bg="danger"><XCircleFill /></Badge>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div>
                                                            {day.actual_start || '-'}
                                                            {day.actual_start && (
                                                                <small className="text-muted d-block">
                                                                    Attendu: {day.expected_start}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            {day.actual_end || '-'}
                                                            {day.actual_end && (
                                                                <small className="text-muted d-block">
                                                                    Attendu: {day.expected_end}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <strong>{day.work_hours}h</strong>
                                                            <small className="text-muted d-block">
                                                                / {day.expected_hours}h
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {day.late_minutes > 0 ? (
                                                            <Badge bg="warning">{day.late_minutes} min</Badge>
                                                        ) : (
                                                            <Badge bg="success">À l'heure</Badge>
                                                        )}
                                                    </td>
                                                    <td>{getPunctualityBadge(day.punctuality_status)}</td>
                                                    <td>
                                                        <Badge bg="info">
                                                            {day.total_movements} mouvements
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-info"
                                                            onClick={() => loadDayMovements(day.date)}
                                                        >
                                                            <Eye />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Tab>

                    {/* Onglet Mouvements récents */}
                    <Tab eventKey="movements" title="Mouvements récents">
                        <Card>
                            <Card.Header>
                                <ClockHistory className="me-2" />
                                20 derniers mouvements
                            </Card.Header>
                            <Card.Body>
                                <ListGroup>
                                    {detailedStats.recent_movements.map((movement, index) => (
                                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="d-flex align-items-center">
                                                    {movement.type === 'entry' ? (
                                                        <ArrowRightCircle className="text-success me-2" />
                                                    ) : (
                                                        <ArrowLeftCircle className="text-warning me-2" />
                                                    )}
                                                    <div>
                                                        <strong>
                                                            {new Date(movement.date).toLocaleDateString('fr-FR')} à {movement.time}
                                                        </strong>
                                                        <small className="text-muted d-block">
                                                            {movement.type === 'entry' ? 'Entrée' : 'Sortie'} - Superviseur: {movement.supervisor}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {movement.late_minutes > 0 && (
                                                    <Badge bg="warning" className="me-1">
                                                        {movement.late_minutes} min retard
                                                    </Badge>
                                                )}
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </Tab>
                </Tabs>
            ) : !selectedTeacher ? (
                <Alert variant="info" className="text-center">
                    <PersonCheck size={48} className="mb-3" />
                    <h5>Sélectionnez un enseignant</h5>
                    <p>Choisissez un enseignant dans la liste ci-dessus pour voir ses statistiques détaillées.</p>
                </Alert>
            ) : isLoading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" size="lg" />
                    <p className="mt-3">Chargement des statistiques...</p>
                </div>
            ) : null}

            {/* Modal des mouvements du jour */}
            <Modal show={showMovementsModal} onHide={() => setShowMovementsModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <ClockHistory className="me-2" />
                        Mouvements du {selectedDate && new Date(selectedDate).toLocaleDateString('fr-FR')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {dayMovements && (
                        <div>
                            <p><strong>Total mouvements:</strong> {dayMovements.movements_count}</p>
                            <Table responsive>
                                <thead>
                                    <tr>
                                        <th>Heure</th>
                                        <th>Type</th>
                                        <th>Statut</th>
                                        <th>Superviseur</th>
                                        <th>Temps jusqu'au suivant</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dayMovements.timeline.map((movement, index) => (
                                        <tr key={movement.id}>
                                            <td>{movement.time}</td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    {movement.type === 'entry' ? (
                                                        <ArrowRightCircle className="text-success me-1" />
                                                    ) : (
                                                        <ArrowLeftCircle className="text-warning me-1" />
                                                    )}
                                                    {movement.type_label}
                                                </div>
                                            </td>
                                            <td>
                                                {movement.status.is_late && (
                                                    <Badge bg="warning" className="me-1">
                                                        {movement.late_minutes} min retard
                                                    </Badge>
                                                )}
                                                {movement.status.is_early_departure && (
                                                    <Badge bg="info" className="me-1">
                                                        {movement.early_departure_minutes} min tôt
                                                    </Badge>
                                                )}
                                                {!movement.status.is_late && !movement.status.is_early_departure && (
                                                    <Badge bg="success">Ponctuel</Badge>
                                                )}
                                            </td>
                                            <td>{movement.supervisor}</td>
                                            <td>
                                                {movement.time_until_next ? 
                                                    formatDuration(movement.time_until_next) : 
                                                    '-'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMovementsModal(false)}>
                        Fermer
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default TeacherDetailedStats;