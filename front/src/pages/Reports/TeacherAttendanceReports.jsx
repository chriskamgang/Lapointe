/**
 * Rapports de présences des enseignants
 * Affichage des statistiques et génération de rapports
 */

import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Table,
    Badge,
    Form,
    Modal,
    Spinner,
    ProgressBar,
    ButtonGroup,
    Alert
} from 'react-bootstrap';
import {
    BarChart,
    Calendar,
    Download,
    FileEarmarkPdf,
    FileEarmarkExcel,
    PersonCheck,
    PersonX,
    Clock,
    TrendingUp,
    TrendingDown,
    Eye,
    Filter,
    Refresh
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

const TeacherAttendanceReports = () => {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
    const [endDate, setEndDate] = useState(new Date());
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDayDetails, setSelectedDayDetails] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState(null);

    const { user } = useAuth();

    useEffect(() => {
        loadTeachers();
        loadGlobalStats();
    }, []);

    useEffect(() => {
        if (selectedTeacher) {
            loadTeacherReport();
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

    const loadGlobalStats = async () => {
        try {
            const response = await secureApiEndpoints.teacherAttendance.getEntryExitStats();
            if (response.success) {
                setAttendanceStats(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    };

    const loadTeacherReport = async () => {
        if (!selectedTeacher) return;

        try {
            setIsLoading(true);
            const response = await secureApiEndpoints.teacherAttendance.getTeacherReport(selectedTeacher, {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });

            if (response.success) {
                setReportData(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement du rapport:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const showDayDetails = (dayData) => {
        setSelectedDayDetails(dayData);
        setShowDetailModal(true);
    };

    const exportToPDF = () => {
        // Logique d'export PDF
        console.log('Export PDF en cours...');
    };

    const exportToExcel = () => {
        // Logique d'export Excel
        console.log('Export Excel en cours...');
    };

    // Configuration des graphiques
    const getAttendanceChartData = () => {
        if (!reportData?.daily_attendances) return null;

        const last7Days = reportData.daily_attendances.slice(-7);
        
        return {
            labels: last7Days.map(day => new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })),
            datasets: [
                {
                    label: 'Présent',
                    data: last7Days.map(day => day.is_present ? 1 : 0),
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Absent',
                    data: last7Days.map(day => !day.is_present ? 1 : 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2
                }
            ]
        };
    };

    const getPunctualityChartData = () => {
        if (!reportData?.daily_attendances) return null;

        const punctualDays = reportData.daily_attendances.filter(day => day.punctuality_status === 'punctual').length;
        const lateDays = reportData.daily_attendances.filter(day => day.punctuality_status === 'late').length;
        const earlyDepartureDays = reportData.daily_attendances.filter(day => day.punctuality_status === 'early_departure').length;
        const lateAndEarlyDays = reportData.daily_attendances.filter(day => day.punctuality_status === 'late_and_early').length;

        return {
            labels: ['Ponctuel', 'En retard', 'Départ anticipé', 'Retard + Départ anticipé'],
            datasets: [
                {
                    data: [punctualDays, lateDays, earlyDepartureDays, lateAndEarlyDays],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }
            ]
        };
    };

    const getWorkHoursChartData = () => {
        if (!reportData?.daily_attendances) return null;

        const last14Days = reportData.daily_attendances.slice(-14);
        
        return {
            labels: last14Days.map(day => new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
            datasets: [
                {
                    label: 'Heures travaillées',
                    data: last14Days.map(day => day.work_hours || 0),
                    fill: false,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                },
                {
                    label: 'Heures attendues',
                    data: last14Days.map(() => reportData.teacher.daily_work_hours || 8),
                    fill: false,
                    borderColor: 'rgba(156, 163, 175, 1)',
                    backgroundColor: 'rgba(156, 163, 175, 0.1)',
                    borderDash: [5, 5],
                    pointRadius: 0
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

    const selectedTeacherData = teachers.find(t => t.id === parseInt(selectedTeacher));

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>
                                <BarChart className="me-2" />
                                Rapports Présences Enseignants
                            </h2>
                            <p className="text-muted mb-0">
                                Statistiques et analyses des présences
                            </p>
                        </div>
                        
                        <ButtonGroup>
                            <Button variant="outline-success" onClick={exportToExcel}>
                                <FileEarmarkExcel className="me-1" />
                                Excel
                            </Button>
                            <Button variant="outline-danger" onClick={exportToPDF}>
                                <FileEarmarkPdf className="me-1" />
                                PDF
                            </Button>
                            <Button variant="outline-secondary" onClick={loadGlobalStats}>
                                <Refresh className="me-1" />
                                Actualiser
                            </Button>
                        </ButtonGroup>
                    </div>
                </Col>
            </Row>

            {/* Statistiques globales */}
            {attendanceStats && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <PersonCheck size={24} className="text-success mb-2" />
                                <h4>{attendanceStats.totals.present_teachers}</h4>
                                <small className="text-muted">Présents aujourd'hui</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <TrendingUp size={24} className="text-primary mb-2" />
                                <h4>{attendanceStats.totals.entries}</h4>
                                <small className="text-muted">Entrées aujourd'hui</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <TrendingDown size={24} className="text-warning mb-2" />
                                <h4>{attendanceStats.totals.exits}</h4>
                                <small className="text-muted">Sorties aujourd'hui</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center">
                            <Card.Body>
                                <Clock size={24} className="text-danger mb-2" />
                                <h4>{attendanceStats.totals.late_teachers}</h4>
                                <small className="text-muted">En retard aujourd'hui</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Filtres */}
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Header>
                            <Filter className="me-2" />
                            Filtres du rapport
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
                                        onClick={loadTeacherReport}
                                        disabled={!selectedTeacher || isLoading}
                                        className="mb-3"
                                    >
                                        Générer
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Rapport individuel */}
            {reportData && (
                <>
                    {/* Informations enseignant et statistiques */}
                    <Row className="mb-4">
                        <Col md={4}>
                            <Card>
                                <Card.Header>
                                    <PersonCheck className="me-2" />
                                    Informations Enseignant
                                </Card.Header>
                                <Card.Body>
                                    <h5>{selectedTeacherData?.full_name}</h5>
                                    <p className="text-muted mb-2">{selectedTeacherData?.email}</p>
                                    <hr />
                                    <p className="mb-1">
                                        <strong>Horaires:</strong> {selectedTeacherData?.expected_arrival_time || '08:00'} - {selectedTeacherData?.expected_departure_time || '17:00'}
                                    </p>
                                    <p className="mb-1">
                                        <strong>Heures/jour:</strong> {selectedTeacherData?.daily_work_hours || 8}h
                                    </p>
                                    <p className="mb-0">
                                        <strong>Période:</strong> {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                                    </p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={8}>
                            <Card>
                                <Card.Header>
                                    <BarChart className="me-2" />
                                    Statistiques de la période
                                </Card.Header>
                                <Card.Body>
                                    <Row>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-success">{reportData.statistics.present_days}</h4>
                                            <small className="text-muted">Jours présents</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-danger">{reportData.statistics.absent_days}</h4>
                                            <small className="text-muted">Jours absents</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-warning">{reportData.statistics.late_days}</h4>
                                            <small className="text-muted">Retards</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <h4 className="text-info">{reportData.statistics.total_work_hours}h</h4>
                                            <small className="text-muted">Heures travaillées</small>
                                        </Col>
                                    </Row>
                                    <hr />
                                    <Row>
                                        <Col md={6}>
                                            <div className="text-center">
                                                <h5 className="text-primary">{reportData.statistics.attendance_rate}%</h5>
                                                <small className="text-muted">Taux de présence</small>
                                                <ProgressBar 
                                                    now={reportData.statistics.attendance_rate} 
                                                    variant={reportData.statistics.attendance_rate >= 90 ? 'success' : reportData.statistics.attendance_rate >= 70 ? 'warning' : 'danger'}
                                                    className="mt-2"
                                                />
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="text-center">
                                                <h5 className="text-primary">{reportData.statistics.punctuality_rate}%</h5>
                                                <small className="text-muted">Taux de ponctualité</small>
                                                <ProgressBar 
                                                    now={reportData.statistics.punctuality_rate} 
                                                    variant={reportData.statistics.punctuality_rate >= 90 ? 'success' : reportData.statistics.punctuality_rate >= 70 ? 'warning' : 'danger'}
                                                    className="mt-2"
                                                />
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Graphiques */}
                    <Row className="mb-4">
                        <Col md={6}>
                            <Card>
                                <Card.Header>Présences (7 derniers jours)</Card.Header>
                                <Card.Body>
                                    {getAttendanceChartData() && (
                                        <Bar data={getAttendanceChartData()} options={chartOptions} />
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card>
                                <Card.Header>Répartition ponctualité</Card.Header>
                                <Card.Body>
                                    {getPunctualityChartData() && (
                                        <Doughnut data={getPunctualityChartData()} />
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <Row className="mb-4">
                        <Col>
                            <Card>
                                <Card.Header>Heures de travail (14 derniers jours)</Card.Header>
                                <Card.Body>
                                    {getWorkHoursChartData() && (
                                        <Line data={getWorkHoursChartData()} options={chartOptions} />
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Détails quotidiens */}
                    <Row className="mb-4">
                        <Col>
                            <Card>
                                <Card.Header>
                                    <Calendar className="me-2" />
                                    Détails quotidiens
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
                                                    <th>Entrée</th>
                                                    <th>Sortie</th>
                                                    <th>Heures</th>
                                                    <th>Ponctualité</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.daily_attendances.map((day, index) => (
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
                                                                <Badge bg="success">Présent</Badge>
                                                            ) : (
                                                                <Badge bg="danger">Absent</Badge>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {day.entry ? new Date(day.entry.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </td>
                                                        <td>
                                                            {day.exit ? new Date(day.exit.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </td>
                                                        <td>{day.work_hours ? `${day.work_hours}h` : '-'}</td>
                                                        <td>
                                                            {day.punctuality_status === 'punctual' && <Badge bg="success">Ponctuel</Badge>}
                                                            {day.punctuality_status === 'late' && <Badge bg="warning">Retard</Badge>}
                                                            {day.punctuality_status === 'early_departure' && <Badge bg="info">Départ anticipé</Badge>}
                                                            {day.punctuality_status === 'late_and_early' && <Badge bg="danger">Retard + Départ</Badge>}
                                                            {day.punctuality_status === 'absent' && <Badge bg="secondary">Absent</Badge>}
                                                        </td>
                                                        <td>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-info"
                                                                onClick={() => showDayDetails(day)}
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
                        </Col>
                    </Row>
                </>
            )}

            {/* Message si aucun enseignant sélectionné */}
            {!selectedTeacher && (
                <Row>
                    <Col>
                        <Alert variant="info" className="text-center">
                            <PersonCheck size={48} className="mb-3" />
                            <h5>Sélectionnez un enseignant</h5>
                            <p>Choisissez un enseignant dans la liste ci-dessus pour voir son rapport de présence.</p>
                        </Alert>
                    </Col>
                </Row>
            )}

            {/* Modal détails jour */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Calendar className="me-2" />
                        Détails du {selectedDayDetails && new Date(selectedDayDetails.date).toLocaleDateString('fr-FR')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDayDetails && (
                        <div>
                            <h6>Présence</h6>
                            <p>{selectedDayDetails.is_present ? '✅ Présent' : '❌ Absent'}</p>
                            
                            {selectedDayDetails.entry && (
                                <>
                                    <h6>Entrée</h6>
                                    <p>
                                        <strong>Heure:</strong> {new Date(selectedDayDetails.entry.scanned_at).toLocaleTimeString('fr-FR')}
                                        <br />
                                        {selectedDayDetails.late_minutes > 0 && (
                                            <span className="text-warning">
                                                <strong>Retard:</strong> {selectedDayDetails.late_minutes} minutes
                                            </span>
                                        )}
                                    </p>
                                </>
                            )}
                            
                            {selectedDayDetails.exit && (
                                <>
                                    <h6>Sortie</h6>
                                    <p>
                                        <strong>Heure:</strong> {new Date(selectedDayDetails.exit.scanned_at).toLocaleTimeString('fr-FR')}
                                        <br />
                                        <strong>Heures travaillées:</strong> {selectedDayDetails.work_hours}h
                                        <br />
                                        {selectedDayDetails.early_departure_minutes > 0 && (
                                            <span className="text-info">
                                                <strong>Départ anticipé:</strong> {selectedDayDetails.early_departure_minutes} minutes
                                            </span>
                                        )}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                        Fermer
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default TeacherAttendanceReports;