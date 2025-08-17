import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Spinner,
    Alert,
    Badge,
    Tabs,
    Tab
} from 'react-bootstrap';
import {
    BarChartFill,
    Person,
    Building,
    PersonFill,
    Grid3x3Gap,
    Calendar,
    TrendingUp,
    PieChartFill
} from 'react-bootstrap-icons';
// Composants de graphiques personnalisés simples
import { secureApiEndpoints } from '../utils/apiMigration';
import { useAuth } from '../hooks/useAuth';

// Composant simple de graphique en barres
const SimpleBarChart = ({ data, title, color = '#0d6efd' }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(item => item.value));
    
    return (
        <div className="simple-chart">
            <h6 className="text-center mb-3">{title}</h6>
            <div className="chart-bars">
                {data.map((item, index) => (
                    <div key={index} className="d-flex align-items-center mb-2">
                        <div className="chart-label" style={{ width: '120px', fontSize: '0.8rem' }}>
                            {item.label}
                        </div>
                        <div className="chart-bar-container flex-grow-1 mx-2">
                            <div 
                                className="chart-bar" 
                                style={{ 
                                    width: `${(item.value / maxValue) * 100}%`,
                                    height: '20px',
                                    backgroundColor: color,
                                    borderRadius: '4px',
                                    minWidth: '2px'
                                }}
                            ></div>
                        </div>
                        <div className="chart-value" style={{ width: '40px', fontSize: '0.8rem', textAlign: 'right' }}>
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Composant simple de graphique en secteurs
const SimplePieChart = ({ data, title, colors = ['#0d6efd', '#dc3545'] }) => {
    if (!data || data.length === 0) return null;
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;
    
    return (
        <div className="simple-chart">
            <h6 className="text-center mb-3">{title}</h6>
            <div className="d-flex justify-content-center mb-3">
                <div 
                    className="pie-chart-container"
                    style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        background: `conic-gradient(${data.map((item, index) => {
                            const percentage = (item.value / total) * 100;
                            const previousPercentage = data.slice(0, index).reduce((sum, prev) => sum + (prev.value / total) * 100, 0);
                            return `${colors[index] || '#6c757d'} ${previousPercentage}% ${previousPercentage + percentage}%`;
                        }).join(', ')})`
                    }}
                ></div>
            </div>
            <div className="pie-chart-legend">
                {data.map((item, index) => (
                    <div key={index} className="d-flex align-items-center justify-content-center mb-1">
                        <div 
                            className="legend-color me-2"
                            style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: colors[index] || '#6c757d',
                                borderRadius: '2px'
                            }}
                        ></div>
                        <small>{item.label}: {item.value} ({Math.round((item.value / total) * 100)}%)</small>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Composant simple de graphique linéaire
const SimpleLineChart = ({ data, title, color = '#198754' }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(item => item.value));
    const minValue = Math.min(...data.map(item => item.value));
    const range = maxValue - minValue || 1;
    
    return (
        <div className="simple-chart">
            <h6 className="text-center mb-3">{title}</h6>
            <div className="line-chart-container" style={{ height: '200px', position: 'relative', padding: '20px' }}>
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        points={data.map((item, index) => {
                            const x = (index / (data.length - 1)) * 100;
                            const y = 100 - ((item.value - minValue) / range) * 80;
                            return `${x}%,${y}%`;
                        }).join(' ')}
                    />
                    {data.map((item, index) => {
                        const x = (index / (data.length - 1)) * 100;
                        const y = 100 - ((item.value - minValue) / range) * 80;
                        return (
                            <circle
                                key={index}
                                cx={`${x}%`}
                                cy={`${y}%`}
                                r="3"
                                fill={color}
                            />
                        );
                    })}
                </svg>
            </div>
            <div className="d-flex justify-content-between text-muted small">
                {data.map((item, index) => (
                    <div key={index} style={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

const Stats = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('students');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await secureApiEndpoints.stats.getGlobal();
            
            if (response.success) {
                setStats(response.data);
            } else {
                setError(response.message || 'Erreur lors du chargement des statistiques');
            }
        } catch (error) {
            console.error('Stats error:', error);
            setError('Erreur lors du chargement des statistiques');
        } finally {
            setLoading(false);
        }
    };

    // Configuration des couleurs
    const colors = {
        primary: '#0d6efd',
        success: '#198754',
        info: '#0dcaf0',
        warning: '#ffc107',
        danger: '#dc3545',
        secondary: '#6c757d',
        light: '#f8f9fa',
        dark: '#212529'
    };

    // Graphique de répartition par genre (étudiants)
    const renderStudentGenderChart = () => {
        if (!stats?.students?.gender_distribution) return null;

        const data = [
            { label: 'Garçons', value: stats.students.gender_distribution.male },
            { label: 'Filles', value: stats.students.gender_distribution.female }
        ];

        return <SimplePieChart 
            data={data} 
            title="Répartition par Genre" 
            colors={[colors.info, colors.danger]} 
        />;
    };

    // Graphique de répartition par section (étudiants)
    const renderStudentSectionChart = () => {
        if (!stats?.students?.section_distribution || stats.students.section_distribution.length === 0) return null;

        const data = stats.students.section_distribution.map(item => ({
            label: item.section_name,
            value: item.count
        }));

        return <SimpleBarChart 
            data={data} 
            title="Répartition par Section" 
            color={colors.primary} 
        />;
    };

    // Graphique d'évolution mensuelle des étudiants
    const renderStudentEvolutionChart = () => {
        if (!stats?.students?.monthly_evolution || stats.students.monthly_evolution.length === 0) return null;

        const data = stats.students.monthly_evolution.map(item => ({
            label: item.month_name,
            value: item.count
        }));

        return <SimpleLineChart 
            data={data} 
            title="Évolution des Inscriptions (12 derniers mois)" 
            color={colors.success} 
        />;
    };

    // Graphique des classes les plus remplies
    const renderTopClassesChart = () => {
        if (!stats?.classes?.top_classes || stats.classes.top_classes.length === 0) return null;

        const data = stats.classes.top_classes.map(item => ({
            label: item.name,
            value: item.students_count
        }));

        return <SimpleBarChart 
            data={data} 
            title="Classes avec le Plus d'Élèves" 
            color={colors.success} 
        />;
    };

    // Graphique de taux d'occupation des séries
    const renderOccupancyChart = () => {
        if (!stats?.classes?.capacity_stats || stats.classes.capacity_stats.length === 0) return null;

        return (
            <div className="simple-chart">
                <h6 className="text-center mb-3">Taux d'Occupation des Séries</h6>
                <div className="occupancy-chart">
                    {stats.classes.capacity_stats.slice(0, 8).map((item, index) => {
                        const color = item.occupancy_rate > 90 ? colors.danger : 
                                    item.occupancy_rate > 70 ? colors.warning : colors.success;
                        return (
                            <div key={index} className="d-flex align-items-center mb-2">
                                <div className="chart-label" style={{ width: '120px', fontSize: '0.8rem' }}>
                                    {item.series_name}
                                </div>
                                <div className="flex-grow-1 mx-2" style={{ height: '20px', backgroundColor: '#e9ecef', borderRadius: '4px', position: 'relative' }}>
                                    <div 
                                        style={{ 
                                            width: `${item.occupancy_rate}%`,
                                            height: '100%',
                                            backgroundColor: color,
                                            borderRadius: '4px',
                                            minWidth: '2px'
                                        }}
                                    ></div>
                                </div>
                                <div className="chart-value" style={{ width: '50px', fontSize: '0.8rem', textAlign: 'right' }}>
                                    {item.occupancy_rate.toFixed(1)}%
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Graphique de répartition par genre (enseignants) - Admin seulement
    const renderTeacherGenderChart = () => {
        if (!stats?.teachers?.gender_distribution) return null;

        const data = [
            { label: 'Hommes', value: stats.teachers.gender_distribution.male },
            { label: 'Femmes', value: stats.teachers.gender_distribution.female }
        ];

        return <SimplePieChart 
            data={data} 
            title="Répartition par Genre" 
            colors={[colors.warning, colors.info]} 
        />;
    };

    // Graphique de qualification des enseignants
    const renderTeacherQualificationChart = () => {
        if (!stats?.teachers?.qualification_distribution || stats.teachers.qualification_distribution.length === 0) return null;

        const data = stats.teachers.qualification_distribution.map(item => ({
            label: item.qualification,
            value: item.count
        }));

        return <SimpleBarChart 
            data={data} 
            title="Répartition par Qualification" 
            color={colors.warning} 
        />;
    };

    if (loading) {
        return (
            <Container fluid className="py-4">
                <div className="text-center">
                    <Spinner animation="border" size="lg" />
                    <p className="mt-3">Chargement des statistiques...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container fluid className="py-4">
                <Alert variant="danger">
                    <Alert.Heading>Erreur</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="h4 mb-1 d-flex align-items-center">
                                <BarChartFill size={24} className="me-2" />
                                Statistiques du Système
                            </h2>
                            <p className="text-muted mb-0">
                                Vue d'ensemble des données du système
                                {stats?.meta?.current_year && <span> - {stats.meta.current_year}</span>}
                            </p>
                        </div>
                        <Badge bg="info">
                            Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
                        </Badge>
                    </div>
                </Col>
            </Row>

            {/* Cards de résumé */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="border-primary">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="me-3">
                                    <Person size={32} className="text-primary" />
                                </div>
                                <div>
                                    <h5 className="mb-0">{stats?.students?.total || 0}</h5>
                                    <small className="text-muted">Élèves Total</small>
                                    <div>
                                        <Badge bg="success" className="me-1">{stats?.students?.active || 0} actifs</Badge>
                                        <Badge bg="secondary">{stats?.students?.inactive || 0} inactifs</Badge>
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="border-success">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="me-3">
                                    <Building size={32} className="text-success" />
                                </div>
                                <div>
                                    <h5 className="mb-0">{stats?.classes?.total_classes || 0}</h5>
                                    <small className="text-muted">Classes</small>
                                    <div>
                                        <Badge bg="info">{stats?.classes?.total_series || 0} séries</Badge>
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                {user?.role === 'admin' && (
                    <Col md={4}>
                        <Card className="border-warning">
                            <Card.Body>
                                <div className="d-flex align-items-center">
                                    <div className="me-3">
                                        <PersonFill size={32} className="text-warning" />
                                    </div>
                                    <div>
                                        <h5 className="mb-0">{stats?.teachers?.total || 0}</h5>
                                        <small className="text-muted">Enseignants</small>
                                        <div>
                                            <Badge bg="success" className="me-1">{stats?.teachers?.active || 0} actifs</Badge>
                                            <Badge bg="secondary">{stats?.teachers?.inactive || 0} inactifs</Badge>
                                        </div>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>

            {/* Graphiques par onglets */}
            <Card>
                <Card.Body>
                    <Tabs activeKey={activeTab} onSelect={setActiveTab}>
                        {/* Onglet Élèves */}
                        <Tab eventKey="students" title={
                            <span className='d-flex align-items-center'><Person className="me-2" />Élèves</span>
                        }>
                            <Row className="mt-4">
                                <Col md={6}>
                                    <Card className="h-100">
                                        <Card.Body>
                                            {renderStudentGenderChart()}
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="h-100">
                                        <Card.Body>
                                            {renderStudentSectionChart()}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <Row className="mt-4">
                                <Col>
                                    <Card>
                                        <Card.Body>
                                            {renderStudentEvolutionChart()}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab>

                        {/* Onglet Classes */}
                        <Tab eventKey="classes" title={
                            <span className='d-flex align-items-center'><Building className="me-2" />Classes</span>
                        }>
                            <Row className="mt-4">
                                <Col md={6}>
                                    <Card className="h-100">
                                        <Card.Body>
                                            {renderTopClassesChart()}
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="h-100">
                                        <Card.Body>
                                            {renderOccupancyChart()}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab>

                        {/* Onglet Enseignants - Admin seulement */}
                        {user?.role === 'admin' && (
                            <Tab eventKey="teachers" title={
                                <span className='d-flex align-items-center'><PersonFill className="me-2" />Enseignants</span>
                            }>
                                <Row className="mt-4">
                                    <Col md={6}>
                                        <Card className="h-100">
                                            <Card.Body>
                                                {renderTeacherGenderChart()}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card className="h-100">
                                            <Card.Body>
                                                {renderTeacherQualificationChart()}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </Tab>
                        )}
                    </Tabs>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Stats;