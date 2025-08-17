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
    Collection,
    Search,
    List
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { extractErrorMessage } from '../../utils/errorHandler';

const DetailedCollectionReport = () => {
    const [encaissements, setEncaissements] = useState([]);
    const [sections, setSections] = useState([]);
    const [summary, setSummary] = useState({});
    const [sectionInfo, setSectionInfo] = useState(null);
    const [schoolYear, setSchoolYear] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres
    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        section_id: ''
    });

    useEffect(() => {
        // Définir les dates par défaut (mois courant)
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters({
            start_date: firstDayOfMonth.toISOString().split('T')[0],
            end_date: lastDayOfMonth.toISOString().split('T')[0],
            section_id: ''
        });

        loadSections();
    }, []);

    const loadSections = async () => {
        try {
            const response = await secureApiEndpoints.sections.getAll();
            if (response.success) {
                setSections(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des sections:', error);
        }
    };

    const loadEncaissements = async () => {
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

            const response = await secureApiEndpoints.reports.getDetailedCollectionReport(filters);

            if (response.success) {
                setEncaissements(response.data.encaissements);
                setSummary(response.data.summary);
                setSectionInfo(response.data.section_info);
                setSchoolYear(response.data.school_year);
                setSuccess(`${response.data.encaissements.length} encaissements trouvés`);
            } else {
                setError(response.message);
            }
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

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>Encaissement Détaillé de la Période</h2>
                            <p className="text-muted">
                                Rapport détaillé des encaissements avec filtres par période et section
                            </p>
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
                        Filtres
                    </h5>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={3}>
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
                        <Col md={3}>
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
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Section</Form.Label>
                                <Form.Select
                                    value={filters.section_id}
                                    onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
                                >
                                    <option value="">Toutes les sections</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>
                                            {section.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Button
                                variant="primary"
                                onClick={loadEncaissements}
                                disabled={loading}
                                className="me-2"
                            >
                                <Search className="me-2" />
                                {loading ? 'Chargement...' : 'Générer'}
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Résumé */}
            {summary.total_encaissements > 0 && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="bg-primary text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Total Encaissements</h6>
                                        <h4>{summary.total_encaissements}</h4>
                                    </div>
                                    <FileEarmarkText size={30} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-warning text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Total Inscriptions</h6>
                                        <h4>{formatAmount(summary.total_inscription)}</h4>
                                    </div>
                                    <Collection size={30} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-info text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Total Tranches</h6>
                                        <h4>{formatAmount(summary.total_tranches)}</h4>
                                    </div>
                                    <List size={30} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="bg-success text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Total Général</h6>
                                        <h4>{formatAmount(summary.total_general)}</h4>
                                    </div>
                                    <CurrencyDollar size={30} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Informations de la période et section */}
            {summary.total_encaissements > 0 && (
                <Card className="mb-4">
                    <Card.Body>
                        <Row>
                            <Col md={4}>
                                <strong>Période :</strong> Du {formatDate(summary.period_start)} au {formatDate(summary.period_end)}
                            </Col>
                            <Col md={4}>
                                <strong>Section :</strong> {sectionInfo ? sectionInfo.name : 'Toutes les sections'}
                            </Col>
                            <Col md={4}>
                                <strong>Année scolaire :</strong> {schoolYear?.name || 'N/A'}
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {/* Tableau des encaissements */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">
                        Détail des Encaissements
                        {summary.total_encaissements > 0 && (
                            <Badge bg="secondary" className="ms-2">
                                {summary.total_encaissements} encaissements
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
                    ) : encaissements.length === 0 ? (
                        <div className="text-center py-4">
                            <FileEarmarkText size={48} className="text-muted mb-3" />
                            <p className="text-muted">
                                Aucun encaissement trouvé pour la période sélectionnée
                            </p>
                            <p className="small text-muted">
                                Veuillez sélectionner des filtres et cliquer sur "Générer"
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <Table striped hover>
                                    <thead className="table-dark">
                                        <tr>
                                            <th>N°</th>
                                            <th>Matricule</th>
                                            <th>Nom</th>
                                            <th>Prénom</th>
                                            <th>Classe</th>
                                            <th className="text-end">Inscription</th>
                                            <th className="text-end">Tranches</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {encaissements.map((encaissement, index) => (
                                            <tr key={index}>
                                                <td>{encaissement.numero}</td>
                                                <td>
                                                    <Badge bg="outline-primary" text="primary">
                                                        {encaissement.matricule}
                                                    </Badge>
                                                </td>
                                                <td><strong>{encaissement.nom}</strong></td>
                                                <td><strong>{encaissement.prenom}</strong></td>
                                                <td>{encaissement.classe}</td>
                                                <td className="text-end">
                                                    <strong className="text-warning">
                                                        {formatAmount(encaissement.inscription_montant)}
                                                    </strong>
                                                </td>
                                                <td className="text-end">
                                                    <strong className="text-info">
                                                        {formatAmount(encaissement.tranche_montant)}
                                                    </strong>
                                                </td>
                                                <td>{encaissement.payment_date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-secondary">
                                        <tr>
                                            <th colSpan={5} className="text-end">
                                                <strong>TOTAL :</strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-warning fs-6">
                                                    {formatAmount(summary.total_inscription)}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-info fs-6">
                                                    {formatAmount(summary.total_tranches)}
                                                </strong>
                                            </th>
                                            <th className="text-center">
                                                <strong className="text-success fs-6">
                                                    {formatAmount(summary.total_general)}
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

export default DetailedCollectionReport;