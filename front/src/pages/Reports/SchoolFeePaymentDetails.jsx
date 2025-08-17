import { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Table,
    Form,
    Alert,
    Spinner,
    Badge
} from 'react-bootstrap';
import {
    FileEarmarkText,
    Calendar2,
    CurrencyDollar,
    Download,
    FiletypePdf,
    Search
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { extractErrorMessage } from '../../utils/errorHandler';
import { authService } from '../../services/authService';
import Swal from 'sweetalert2';

const SchoolFeePaymentDetails = () => {
    const [paymentDetails, setPaymentDetails] = useState([]);
    const [summary, setSummary] = useState({});
    const [schoolYear, setSchoolYear] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        // Définir les dates par défaut (mois courant)
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters({
            start_date: firstDayOfMonth.toISOString().split('T')[0],
            end_date: lastDayOfMonth.toISOString().split('T')[0]
        });
    }, []);

    const loadPaymentDetails = async () => {
        if (!filters.start_date || !filters.end_date) {
            setError('Les dates de début et de fin sont obligatoires');
            return;
        }

        if (new Date(filters.start_date) > new Date(filters.end_date)) {
            setError('La date de début doit être antérieure à la date de fin');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await secureApiEndpoints.reports.getSchoolFeePaymentDetails({
                start_date: filters.start_date,
                end_date: filters.end_date
            });

            if (response.success) {
                setPaymentDetails(response.data.payment_details);
                setSummary(response.data.summary);
                setSchoolYear(response.data.school_year);
                setSuccess(`${response.data.payment_details.length} paiements trouvés`);
            } else {
                setError(response.message);
            }
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const exportToPdf = async () => {
        if (!filters.start_date || !filters.end_date) {
            setError('Veuillez d\'abord charger les données avec des dates valides');
            return;
        }

        try {
            setLoading(true);

            // Créer l'URL d'export avec les paramètres
            const exportParams = {
                start_date: filters.start_date,
                end_date: filters.end_date
            };

            // Utiliser une approche plus directe avec fetch et blob pour PDF
            const response = await fetch(`${window.location.protocol}//${window.location.hostname}:8000/api/reports/school-fee-payment-details/export-pdf?${new URLSearchParams(exportParams).toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Créer un blob à partir de la réponse HTML
            const htmlBlob = await response.blob();
            
            // Créer une URL temporaire et l'ouvrir dans un nouvel onglet
            const blobUrl = window.URL.createObjectURL(htmlBlob);
            window.open(blobUrl, '_blank');
            
            // Nettoyer l'URL temporaire après un délai
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            setSuccess('Export PDF lancé avec succès');
        } catch (error) {
            setError(extractErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('XAF', 'FCFA');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    // Grouper les paiements par type pour les statistiques
    const getPaymentTypeStats = () => {
        const stats = {};
        paymentDetails.forEach(detail => {
            if (!stats[detail.type_paiement]) {
                stats[detail.type_paiement] = {
                    count: 0,
                    total: 0
                };
            }
            stats[detail.type_paiement].count++;
            stats[detail.type_paiement].total += detail.montant;
        });
        return stats;
    };

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>Détail des Paiements des Frais de Scolarité</h2>
                            <p className="text-muted">
                                Rapport détaillé des paiements par période avec type de paiement abrégé
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-danger"
                                onClick={exportToPdf}
                                disabled={loading || paymentDetails.length === 0}
                            >
                                <FiletypePdf className="me-2" />
                                Exporter PDF
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Alerts */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            {/* Filtres */}
            <Card className="mb-4">
                <Card.Header>
                    <h5 className="mb-0">
                        <Calendar2 className="me-2" />
                        Filtres par Période
                    </h5>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Date de début <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Date de fin <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4} className="d-flex align-items-end">
                            <Button
                                variant="primary"
                                onClick={loadPaymentDetails}
                                disabled={loading}
                                className="me-2"
                            >
                                <Search className="me-2" />
                                {loading ? 'Chargement...' : 'Rechercher'}
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Résumé */}
            {summary.total_payments > 0 && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="bg-primary text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Total Paiements</h6>
                                        <h4>{summary.total_payments}</h4>
                                    </div>
                                    <FileEarmarkText size={30} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-success text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Montant Total</h6>
                                        <h4>{formatAmount(summary.total_amount)}</h4>
                                    </div>
                                    <CurrencyDollar size={30} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-info text-white">
                            <Card.Body>
                                <div>
                                    <h6>Période</h6>
                                    <p className="mb-0">
                                        Du {formatDate(summary.period_start)}<br />
                                        au {formatDate(summary.period_end)}
                                    </p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-warning text-white">
                            <Card.Body>
                                <div>
                                    <h6>Année Scolaire</h6>
                                    <h5 className="mb-0">{schoolYear?.name || 'N/A'}</h5>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Statistiques par type de paiement */}
            {paymentDetails.length > 0 && (
                <Card className="mb-4">
                    <Card.Header>
                        <h5 className="mb-0">Statistiques par Type de Paiement</h5>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            {Object.entries(getPaymentTypeStats()).map(([type, stats]) => (
                                <Col md={3} key={type} className="mb-3">
                                    <Card className="bg-light">
                                        <Card.Body className="text-center">
                                            <h6>{type}</h6>
                                            <Badge bg="primary" className="me-2">{stats.count} paiements</Badge>
                                            <br />
                                            <small className="text-success fw-bold">
                                                {formatAmount(stats.total)}
                                            </small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {/* Tableau des détails */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">
                        Détail des Paiements
                        {summary.total_payments > 0 && (
                            <Badge bg="secondary" className="ms-2">
                                {summary.total_payments} paiements
                            </Badge>
                        )}
                    </h5>
                </Card.Header>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </Spinner>
                        </div>
                    ) : paymentDetails.length === 0 ? (
                        <div className="text-center py-4">
                            <FileEarmarkText size={48} className="text-muted mb-3" />
                            <p className="text-muted">
                                Aucun paiement trouvé pour la période sélectionnée
                            </p>
                            <p className="small text-muted">
                                Veuillez sélectionner des dates et cliquer sur "Rechercher"
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <Table striped hover>
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Matricule</th>
                                            <th>Nom</th>
                                            <th>Prénom</th>
                                            <th>Classe</th>
                                            <th>Type Paiement</th>
                                            <th>Date Validation</th>
                                            <th className="text-end">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentDetails.map((detail, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <Badge bg="outline-primary" text="primary">
                                                        {detail.matricule}
                                                    </Badge>
                                                </td>
                                                <td><strong>{detail.nom}</strong></td>
                                                <td><strong>{detail.prenom}</strong></td>
                                                <td>{detail.classe}</td>
                                                <td>
                                                    <Badge 
                                                        bg={
                                                            detail.type_paiement === 'Inscrip' ? 'warning' :
                                                            detail.type_paiement.startsWith('Trch') ? 'info' :
                                                            detail.type_paiement === 'RAME' ? 'success' :
                                                            'secondary'
                                                        }
                                                    >
                                                        {detail.type_paiement}
                                                    </Badge>
                                                </td>
                                                <td>{detail.date_validation}</td>
                                                <td className="text-end">
                                                    <strong className="text-success">
                                                        {formatAmount(detail.montant)}
                                                    </strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-secondary">
                                        <tr>
                                            <th colSpan={6} className="text-end">
                                                <strong>TOTAL GÉNÉRAL :</strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-success fs-5">
                                                    {formatAmount(summary.total_amount)}
                                                </strong>
                                            </th>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default SchoolFeePaymentDetails;