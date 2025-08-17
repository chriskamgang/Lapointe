/**
 * Dashboard Temps Réel pour les Présences
 * Affiche les statistiques live avec graphiques et mises à jour automatiques
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
    Card, 
    Row, 
    Col, 
    Badge, 
    Alert, 
    Button, 
    ButtonGroup,
    Spinner,
    Table,
    ProgressBar
} from 'react-bootstrap';
import {
    People,
    PersonCheck,
    PersonX,
    Clock,
    ArrowUp,
    ArrowDown,
    Activity,
    Wifi,
    WifiOff,
    ArrowClockwise,
    GraphUp
} from 'react-bootstrap-icons';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement
} from 'chart.js';

// Enregistrer les composants Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarElement
);

const RealTimeDashboard = ({ 
    supervisorId, 
    onRefresh, 
    isOnline = true, 
    syncStatus = 'idle' 
}) => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        entriesCount: 0,
        exitsCount: 0,
        attendanceRate: 0,
        hourlyData: [],
        classBreakdown: [],
        recentScans: []
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30); // secondes
    const intervalRef = useRef(null);

    // Options des graphiques
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Présences par heure'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        },
        elements: {
            point: {
                radius: 4,
                hoverRadius: 6
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            },
            title: {
                display: true,
                text: 'Répartition Présence/Absence'
            }
        }
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: 'Présences par classe'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };

    // Données pour le graphique linéaire (présences par heure)
    const lineChartData = {
        labels: stats.hourlyData.map(item => `${item.hour}h`),
        datasets: [
            {
                label: 'Entrées',
                data: stats.hourlyData.map(item => item.entries),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4
            },
            {
                label: 'Sorties',
                data: stats.hourlyData.map(item => item.exits),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.4
            }
        ]
    };

    // Données pour le graphique en donut
    const doughnutData = {
        labels: ['Présents', 'Absents'],
        datasets: [
            {
                data: [stats.presentToday, stats.absentToday],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 99, 132, 0.8)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 2
            }
        ]
    };

    // Données pour le graphique en barres (par classe)
    const barChartData = {
        labels: stats.classBreakdown.map(item => item.className),
        datasets: [
            {
                label: 'Taux de présence (%)',
                data: stats.classBreakdown.map(item => item.attendanceRate),
                backgroundColor: stats.classBreakdown.map(item => 
                    item.attendanceRate >= 80 ? 'rgba(75, 192, 192, 0.8)' :
                    item.attendanceRate >= 60 ? 'rgba(255, 206, 86, 0.8)' :
                    'rgba(255, 99, 132, 0.8)'
                ),
                borderColor: stats.classBreakdown.map(item => 
                    item.attendanceRate >= 80 ? 'rgba(75, 192, 192, 1)' :
                    item.attendanceRate >= 60 ? 'rgba(255, 206, 86, 1)' :
                    'rgba(255, 99, 132, 1)'
                ),
                borderWidth: 1
            }
        ]
    };

    // Charger les données du dashboard
    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            
            // Simuler des données temps réel pour la démo
            // En production, remplacer par les vraies API calls
            const mockStats = {
                totalStudents: 450,
                presentToday: Math.floor(Math.random() * 400) + 300,
                absentToday: Math.floor(Math.random() * 150) + 50,
                entriesCount: Math.floor(Math.random() * 100) + 250,
                exitsCount: Math.floor(Math.random() * 80) + 200,
                hourlyData: generateHourlyData(),
                classBreakdown: generateClassBreakdown(),
                recentScans: generateRecentScans()
            };
            
            mockStats.attendanceRate = Math.round(
                (mockStats.presentToday / mockStats.totalStudents) * 100
            );

            setStats(mockStats);
            setLastUpdate(new Date());
            
            if (onRefresh) {
                onRefresh(mockStats);
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement du dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Générer des données d'exemple pour les heures
    const generateHourlyData = () => {
        const hours = [];
        const currentHour = new Date().getHours();
        
        for (let i = 7; i <= Math.min(currentHour, 18); i++) {
            hours.push({
                hour: i,
                entries: Math.floor(Math.random() * 50) + 10,
                exits: Math.floor(Math.random() * 40) + 5
            });
        }
        
        return hours;
    };

    // Générer des données d'exemple pour les classes
    const generateClassBreakdown = () => {
        const classes = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème'];
        
        return classes.map(className => ({
            className,
            presentCount: Math.floor(Math.random() * 40) + 20,
            totalCount: Math.floor(Math.random() * 20) + 45,
            attendanceRate: Math.floor(Math.random() * 40) + 60
        }));
    };

    // Générer des scans récents
    const generateRecentScans = () => {
        const names = ['Jean Dupont', 'Marie Martin', 'Paul Durand', 'Sophie Dubois', 'Pierre Moreau'];
        const classes = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];
        const events = ['entry', 'exit'];
        
        return Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            studentName: names[Math.floor(Math.random() * names.length)],
            className: classes[Math.floor(Math.random() * classes.length)],
            eventType: events[Math.floor(Math.random() * events.length)],
            timestamp: new Date(Date.now() - i * 60000 * 5) // 5 minutes d'intervalle
        }));
    };

    // Gestion du refresh automatique
    useEffect(() => {
        if (autoRefresh && isOnline) {
            intervalRef.current = setInterval(loadDashboardData, refreshInterval * 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoRefresh, refreshInterval, isOnline]);

    // Chargement initial
    useEffect(() => {
        loadDashboardData();
    }, [supervisorId]);

    // Basculer le refresh automatique
    const toggleAutoRefresh = () => {
        setAutoRefresh(!autoRefresh);
    };

    // Refresh manuel
    const handleManualRefresh = () => {
        loadDashboardData();
    };

    const getStatusIcon = () => {
        if (!isOnline) return <WifiOff className="text-danger" />;
        if (syncStatus === 'syncing') return <Spinner animation="border" size="sm" />;
        return <Wifi className="text-success" />;
    };

    const getStatusText = () => {
        if (!isOnline) return 'Mode offline';
        if (syncStatus === 'syncing') return 'Synchronisation...';
        return 'En ligne';
    };

    const getAttendanceRateColor = (rate) => {
        if (rate >= 80) return 'success';
        if (rate >= 60) return 'warning';
        return 'danger';
    };

    return (
        <div className="real-time-dashboard">
            {/* En-tête avec contrôles */}
            <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <Activity className="me-2" size={20} />
                        <h5 className="mb-0">Dashboard Temps Réel</h5>
                        {lastUpdate && (
                            <small className="text-muted ms-3">
                                Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
                            </small>
                        )}
                    </div>
                    
                    <div className="d-flex align-items-center gap-2">
                        <div className="d-flex align-items-center me-3">
                            {getStatusIcon()}
                            <span className="ms-1 small">{getStatusText()}</span>
                        </div>
                        
                        <ButtonGroup size="sm">
                            <Button 
                                variant={autoRefresh ? "success" : "outline-secondary"}
                                onClick={toggleAutoRefresh}
                                disabled={!isOnline}
                            >
                                Auto ({refreshInterval}s)
                            </Button>
                            <Button 
                                variant="outline-primary" 
                                onClick={handleManualRefresh}
                                disabled={isLoading}
                            >
                                <ArrowClockwise className={isLoading ? "spinning" : ""} />
                            </Button>
                        </ButtonGroup>
                    </div>
                </Card.Header>
            </Card>

            {/* Mode offline warning */}
            {!isOnline && (
                <Alert variant="warning" className="mb-4">
                    <WifiOff className="me-2" />
                    Mode offline activé. Les données affichées peuvent ne pas être à jour.
                </Alert>
            )}

            {/* Cartes de statistiques */}
            <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                    <Card className="h-100 border-start border-4 border-primary">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <div className="small text-primary fw-bold">TOTAL ÉTUDIANTS</div>
                                    <div className="h3 mb-0">{stats.totalStudents.toLocaleString()}</div>
                                </div>
                                <People size={32} className="text-primary opacity-75" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="h-100 border-start border-4 border-success">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <div className="small text-success fw-bold">PRÉSENTS AUJOURD'HUI</div>
                                    <div className="h3 mb-0">{stats.presentToday.toLocaleString()}</div>
                                    <div className="small">
                                        <Badge bg={getAttendanceRateColor(stats.attendanceRate)}>
                                            {stats.attendanceRate}%
                                        </Badge>
                                    </div>
                                </div>
                                <PersonCheck size={32} className="text-success opacity-75" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="h-100 border-start border-4 border-info">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <div className="small text-info fw-bold">ENTRÉES</div>
                                    <div className="h3 mb-0 text-info">{stats.entriesCount}</div>
                                    <div className="small text-muted">
                                        <ArrowUp size={12} className="me-1" />
                                        Aujourd'hui
                                    </div>
                                </div>
                                <div className="text-info opacity-75">
                                    <ArrowUp size={32} />
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="h-100 border-start border-4 border-warning">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                    <div className="small text-warning fw-bold">SORTIES</div>
                                    <div className="h3 mb-0 text-warning">{stats.exitsCount}</div>
                                    <div className="small text-muted">
                                        <ArrowDown size={12} className="me-1" />
                                        Aujourd'hui
                                    </div>
                                </div>
                                <div className="text-warning opacity-75">
                                    <ArrowDown size={32} />
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Graphiques */}
            <Row className="mb-4">
                <Col lg={8} className="mb-3">
                    <Card className="h-100">
                        <Card.Header>
                            <GraphUp className="me-2" />
                            Activité par heure
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                <Line data={lineChartData} options={lineChartOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4} className="mb-3">
                    <Card className="h-100">
                        <Card.Header>Répartition du jour</Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                <Doughnut data={doughnutData} options={doughnutOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Présences par classe */}
            <Row className="mb-4">
                <Col lg={8} className="mb-3">
                    <Card>
                        <Card.Header>Taux de présence par classe</Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                <Bar data={barChartData} options={barChartOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4} className="mb-3">
                    <Card>
                        <Card.Header>
                            <Clock className="me-2" />
                            Scans récents
                        </Card.Header>
                        <Card.Body style={{ height: '300px', overflowY: 'auto' }}>
                            {stats.recentScans.map(scan => (
                                <div key={scan.id} className="d-flex align-items-center justify-content-between mb-2 p-2 bg-light rounded">
                                    <div>
                                        <div className="fw-bold small">{scan.studentName}</div>
                                        <div className="text-muted small">{scan.className}</div>
                                    </div>
                                    <div className="text-end">
                                        <Badge bg={scan.eventType === 'entry' ? 'success' : 'warning'}>
                                            {scan.eventType === 'entry' ? 'Entrée' : 'Sortie'}
                                        </Badge>
                                        <div className="text-muted small">
                                            {scan.timestamp.toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default RealTimeDashboard;