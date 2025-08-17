import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Table,
    Alert,
    Spinner,
    Badge,
    Button,
    Form
} from 'react-bootstrap';
import {
    Printer,
    FileEarmarkText,
    BarChart,
    Building,
    Search,
    Funnel
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';

const SeriesCollectionSummary = () => {
    const [seriesData, setSeriesData] = useState([]);
    const [grandTotals, setGrandTotals] = useState({});
    const [schoolYear, setSchoolYear] = useState(null);
    const [paymentTranches, setPaymentTranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // États pour les filtres
    const [filters, setFilters] = useState({
        class_id: '',
        level_id: ''
    });
    const [filtersData, setFiltersData] = useState({
        classes: [],
        levels: []
    });

    useEffect(() => {
        loadSeriesCollectionSummary();
    }, []);

    const loadSeriesCollectionSummary = async (customFilters = null) => {
        try {
            setLoading(true);
            setError('');
            
            const queryFilters = customFilters || filters;
            // Supprimer les filtres vides
            const cleanFilters = Object.fromEntries(
                Object.entries(queryFilters).filter(([_, value]) => value !== '')
            );
            
            const response = await secureApiEndpoints.reports.getSeriesCollectionSummary(cleanFilters);
            
            if (response.success) {
                setSeriesData(response.data.series_summary);
                setGrandTotals(response.data.grand_totals);
                setSchoolYear(response.data.school_year);
                setPaymentTranches(response.data.payment_tranches);
                setFiltersData(response.data.filters_data);
            } else {
                setError(response.message);
            }
        } catch (error) {
            setError('Erreur lors du chargement des données');
            console.error('Error loading series collection summary:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSearch = () => {
        loadSeriesCollectionSummary();
    };

    const handleResetFilters = () => {
        const resetFilters = {
            class_id: '',
            level_id: ''
        };
        setFilters(resetFilters);
        loadSeriesCollectionSummary(resetFilters);
    };

    const formatAmount = (amount) => {
        return parseInt(amount || 0).toLocaleString() + ' FCFA';
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const html = generatePrintHTML();
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Récapitulatif d'Encaissement par Série</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px; 
                            font-size: 12px;
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin: 20px 0; 
                        }
                        th, td { 
                            border: 1px solid #ddd; 
                            padding: 8px; 
                            text-align: left; 
                        }
                        th { 
                            background-color: #f5f5f5; 
                            font-weight: bold; 
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .text-end { text-align: right; }
                        .header { 
                            text-align: center; 
                            margin-bottom: 30px; 
                            border-bottom: 2px solid #333; 
                            padding-bottom: 20px; 
                        }
                        .totals-row { 
                            background-color: #f8f9fa; 
                            font-weight: bold; 
                        }
                        @media print { 
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${html}
                    <div class="no-print" style="text-align: center; margin-top: 30px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimer</button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Fermer</button>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const generatePrintHTML = () => {
        return `
            <div class="header">
                <h1>COLLÈGE POLYVALENT BILINGUE DE DOUALA</h1>
                <h2>Récapitulatif d'Encaissement par Série</h2>
                <p><strong>Année scolaire:</strong> ${schoolYear?.name || 'N/A'}</p>
                <p><strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            </div>
            
            <div class="summary-stats">
                <h3>Résumé Général</h3>
                <table>
                    <tr>
                        <td><strong>Nombre total de séries:</strong></td>
                        <td class="text-end">${grandTotals.total_series || 0}</td>
                    </tr>
                    <tr>
                        <td><strong>Nombre total d'étudiants:</strong></td>
                        <td class="text-end">${grandTotals.total_students || 0}</td>
                    </tr>
                    <tr>
                        <td><strong>Montant total collecté:</strong></td>
                        <td class="text-end"><strong>${formatAmount(grandTotals.total_collected || 0)}</strong></td>
                    </tr>
                </table>
            </div>

            <div class="detailed-table">
                <h3>Détail par Série</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Série</th>
                            <th class="text-center">Effectif</th>
                            ${paymentTranches.map(tranche => `<th class="text-center">${tranche}</th>`).join('')}
                            <th class="text-center">RAME Physique</th>
                            <th class="text-center">Total Collecté</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${seriesData.map(series => `
                            <tr>
                                <td><strong>${series.full_name}</strong></td>
                                <td class="text-center">${series.student_count}</td>
                                ${paymentTranches.map(tranche => `
                                    <td class="text-end">${formatAmount(series.tranches[tranche]?.amount_collected || 0)}</td>
                                `).join('')}
                                <td class="text-end">${formatAmount(series.tranches['RAME Physique']?.amount_collected || 0)}</td>
                                <td class="text-end"><strong>${formatAmount(series.total_collected)}</strong></td>
                            </tr>
                        `).join('')}
                        <tr class="totals-row">
                            <td><strong>TOTAL GÉNÉRAL</strong></td>
                            <td class="text-center"><strong>${grandTotals.total_students || 0}</strong></td>
                            ${paymentTranches.map(tranche => `
                                <td class="text-end"><strong>${formatAmount(grandTotals.by_tranche?.[tranche] || 0)}</strong></td>
                            `).join('')}
                            <td class="text-end"><strong>${formatAmount(grandTotals.by_tranche?.['RAME Physique'] || 0)}</strong></td>
                            <td class="text-end"><strong>${formatAmount(grandTotals.total_collected || 0)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    };

    if (loading) {
        return (
            <Container fluid className="py-4">
                <div className="text-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </Spinner>
                    <p className="mt-2">Chargement des données...</p>
                </div>
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
                            <h2><Building className="me-2" />Récapitulatif d'Encaissement par Série</h2>
                            <p className="text-muted">
                                Montants collectés par série et par tranche - {schoolYear?.name}
                            </p>
                        </div>
                        <div>
                            <Button variant="success" onClick={handlePrint} className="me-2">
                                <Printer className="me-1" size={16} />
                                Imprimer
                            </Button>
                            <Button variant="outline-secondary" onClick={loadSeriesCollectionSummary}>
                                Actualiser
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Filters */}
            <Card className="mb-4">
                <Card.Header>
                    <h5 className="mb-0">
                        <Funnel className="me-2" />
                        Filtres de Recherche
                    </h5>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Niveau</Form.Label>
                                <Form.Select
                                    value={filters.level_id}
                                    onChange={(e) => handleFilterChange('level_id', e.target.value)}
                                >
                                    <option value="">Tous les niveaux</option>
                                    {filtersData.levels.map(level => (
                                        <option key={level.id} value={level.id}>{level.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Classe</Form.Label>
                                <Form.Select
                                    value={filters.class_id}
                                    onChange={(e) => handleFilterChange('class_id', e.target.value)}
                                >
                                    <option value="">Toutes les classes</option>
                                    {filtersData.classes.map(schoolClass => (
                                        <option key={schoolClass.id} value={schoolClass.id}>
                                            {schoolClass.name} ({schoolClass.level_name})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                            <div className="d-flex gap-2 mb-3">
                                <Button 
                                    variant="primary" 
                                    onClick={handleSearch} 
                                    disabled={loading}
                                    title="Rechercher"
                                >
                                    {loading ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <Search size={16} />
                                    )}
                                </Button>
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={handleResetFilters}
                                    title="Réinitialiser"
                                >
                                    Tout
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Statistics Summary */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="text-center border-primary">
                        <Card.Body>
                            <h3 className="text-primary">{grandTotals.total_series || 0}</h3>
                            <p className="text-muted mb-0">Séries</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center border-info">
                        <Card.Body>
                            <h3 className="text-info">{grandTotals.total_students || 0}</h3>
                            <p className="text-muted mb-0">Étudiants</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="text-center border-success">
                        <Card.Body>
                            <h3 className="text-success">{formatAmount(grandTotals.total_collected || 0)}</h3>
                            <p className="text-muted mb-0">Total Collecté</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Detailed Table */}
            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        <BarChart className="me-2" />
                        Détail par Série et Tranche
                    </h5>
                    <Badge bg="info">{seriesData.length} série(s)</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Série</th>
                                    <th className="text-center">Effectif</th>
                                    {paymentTranches.map(tranche => (
                                        <th key={tranche} className="text-center">{tranche}</th>
                                    ))}
                                    <th className="text-center">RAME Physique</th>
                                    <th className="text-center">Total Collecté</th>
                                </tr>
                            </thead>
                            <tbody>
                                {seriesData.map(series => (
                                    <tr key={series.series_id}>
                                        <td>
                                            <strong>{series.full_name}</strong>
                                            <br />
                                            <small className="text-muted">{series.class_name} - {series.series_name}</small>
                                        </td>
                                        <td className="text-center">
                                            <Badge bg="secondary">{series.student_count}</Badge>
                                        </td>
                                        {paymentTranches.map(tranche => (
                                            <td key={tranche} className="text-end">
                                                {formatAmount(series.tranches[tranche]?.amount_collected || 0)}
                                            </td>
                                        ))}
                                        <td className="text-end">
                                            {formatAmount(series.tranches['RAME Physique']?.amount_collected || 0)}
                                        </td>
                                        <td className="text-end">
                                            <strong className="text-success">
                                                {formatAmount(series.total_collected)}
                                            </strong>
                                        </td>
                                    </tr>
                                ))}
                                {/* Total Row */}
                                <tr className="table-warning fw-bold">
                                    <td><strong>TOTAL GÉNÉRAL</strong></td>
                                    <td className="text-center">
                                        <Badge bg="dark">{grandTotals.total_students || 0}</Badge>
                                    </td>
                                    {paymentTranches.map(tranche => (
                                        <td key={tranche} className="text-end">
                                            <strong>{formatAmount(grandTotals.by_tranche?.[tranche] || 0)}</strong>
                                        </td>
                                    ))}
                                    <td className="text-end">
                                        <strong>{formatAmount(grandTotals.by_tranche?.['RAME Physique'] || 0)}</strong>
                                    </td>
                                    <td className="text-end">
                                        <strong className="text-success fs-5">
                                            {formatAmount(grandTotals.total_collected || 0)}
                                        </strong>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Totals by Tranche */}
            {Object.keys(grandTotals.by_tranche || {}).length > 0 && (
                <Card className="mt-4">
                    <Card.Header>
                        <h5 className="mb-0">
                            <FileEarmarkText className="me-2" />
                            Totaux par Tranche
                        </h5>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            {Object.entries(grandTotals.by_tranche || {}).map(([tranche, amount]) => (
                                <Col md={4} lg={3} key={tranche} className="mb-3">
                                    <Card className="text-center h-100">
                                        <Card.Body>
                                            <h5 className="text-primary">{formatAmount(amount)}</h5>
                                            <p className="text-muted mb-0">{tranche}</p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
};

export default SeriesCollectionSummary;