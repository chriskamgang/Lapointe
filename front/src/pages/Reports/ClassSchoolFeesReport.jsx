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
    FileEarmarkPdf,
    Calendar2,
    CurrencyDollar,
    Collection,
    Search,
    List,
    BuildingsFill
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';
import { extractErrorMessage } from '../../utils/errorHandler';

const ClassSchoolFeesReport = () => {
    const [payments, setPayments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [summary, setSummary] = useState({});
    const [classInfo, setClassInfo] = useState(null);
    const [schoolYear, setSchoolYear] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres
    const [filters, setFilters] = useState({
        class_id: ''
    });

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        try {
            const response = await secureApiEndpoints.schoolClasses.getAll();
            if (response.success) {
                setClasses(response.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des classes:', error);
        }
    };

    const loadClassSchoolFees = async () => {
        if (!filters.class_id) {
            setError('Veuillez sélectionner une classe');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await secureApiEndpoints.reports.getClassSchoolFeesReport(filters);

            if (response.success) {
                setPayments(response.data.students);
                setSummary(response.data.summary);
                setClassInfo(response.data.class_info);
                setSchoolYear(response.data.school_year);
                setSuccess(`${response.data.students.length} élèves trouvés`);
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
        if (!filters.class_id) {
            setError('Veuillez d\'abord générer un rapport');
            return;
        }

        try {
            const response = await fetch(`${window.location.protocol}//${window.location.hostname}:8000/api/reports/class-school-fees/export-pdf?class_id=${filters.class_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/pdf',
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `paiement_frais_scolarite_${classInfo?.name || 'classe'}_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else {
                setError('Erreur lors de l\'export PDF');
            }
        } catch (error) {
            setError('Erreur lors de l\'export PDF: ' + error.message);
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'complete':
                return <Badge bg="success">Complet</Badge>;
            case 'partial':
                return <Badge bg="warning">Partiel</Badge>;
            case 'none':
                return <Badge bg="danger">Aucun</Badge>;
            default:
                return <Badge bg="secondary">N/A</Badge>;
        }
    };

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2>Paiement des Frais de Scolarité par Classe</h2>
                            <p className="text-muted">
                                Rapport détaillé des paiements de frais de scolarité (1ère, 2ème, 3ème tranches)
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
                        <BuildingsFill className="me-2" />
                        Sélection de Classe
                    </h5>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Classe <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    value={filters.class_id}
                                    onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
                                    required
                                >
                                    <option value="">Sélectionner une classe</option>
                                    {classes.map(classe => (
                                        <option key={classe.id} value={classe.id}>
                                            {classe.name} ({classe.level?.section?.name || 'Section N/A'})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4} className="d-flex align-items-end">
                            <Button
                                variant="primary"
                                onClick={loadClassSchoolFees}
                                disabled={loading}
                                className="me-2"
                            >
                                <Search className="me-2" />
                                {loading ? 'Chargement...' : 'Générer'}
                            </Button>
                            {/* Export PDF temporairement désactivé
                            {payments.length > 0 && (
                                <Button
                                    variant="danger"
                                    onClick={exportToPdf}
                                    className="me-2"
                                >
                                    <FileEarmarkPdf className="me-1" />
                                    PDF
                                </Button>
                            )}
                            */}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Résumé */}
            {summary.total_students > 0 && (
                <Row className="mb-4">
                    <Col md={2}>
                        <Card className="bg-primary text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Total Élèves</h6>
                                        <h4>{summary.total_students}</h4>
                                    </div>
                                    <List size={30} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card className="bg-warning text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Inscription</h6>
                                        <h5>{formatAmount(summary.totals?.inscription || 0)}</h5>
                                    </div>
                                    <CurrencyDollar size={25} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card className="bg-success text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>1ère Tranche</h6>
                                        <h5>{formatAmount(summary.totals?.tranche1 || 0)}</h5>
                                    </div>
                                    <CurrencyDollar size={25} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card className="bg-info text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>2ème Tranche</h6>
                                        <h5>{formatAmount(summary.totals?.tranche2 || 0)}</h5>
                                    </div>
                                    <CurrencyDollar size={25} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card className="bg-warning text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>3ème Tranche</h6>
                                        <h5>{formatAmount(summary.totals?.tranche3 || 0)}</h5>
                                    </div>
                                    <CurrencyDollar size={25} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={2}>
                        <Card className="bg-secondary text-white">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6>Total</h6>
                                        <h5>{formatAmount((summary.totals?.inscription || 0) + (summary.totals?.tranche1 || 0) + (summary.totals?.tranche2 || 0) + (summary.totals?.tranche3 || 0))}</h5>
                                    </div>
                                    <Collection size={25} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Informations de la classe */}
            {summary.total_students > 0 && (
                <Card className="mb-4">
                    <Card.Body>
                        <Row>
                            <Col md={4}>
                                <strong>Classe :</strong> {classInfo?.name}
                            </Col>
                            <Col md={4}>
                                <strong>Section :</strong> {classInfo?.section_name}
                            </Col>
                            <Col md={4}>
                                <strong>Année scolaire :</strong> {schoolYear?.name || 'N/A'}
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {/* Tableau des paiements */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">
                        Détail des Paiements de Frais de Scolarité
                        {summary.total_students > 0 && (
                            <Badge bg="secondary" className="ms-2">
                                {summary.total_students} élèves
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
                    ) : payments.length === 0 ? (
                        <div className="text-center py-4">
                            <List size={48} className="text-muted mb-3" />
                            <p className="text-muted">
                                Aucun élève trouvé pour la classe sélectionnée
                            </p>
                            <p className="small text-muted">
                                Veuillez sélectionner une classe et cliquer sur "Générer"
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <Table striped hover size="sm">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>N°</th>
                                            <th>Matricule</th>
                                            <th>Nom</th>
                                            <th>Prénom</th>
                                            <th className="text-end">Inscription</th>
                                            <th className="text-end">1ère Tranche</th>
                                            <th className="text-end">2ème Tranche</th>
                                            <th className="text-end">3ème Tranche</th>
                                            <th className="text-end">Rabais</th>
                                            <th className="text-end">Bourse</th>
                                            <th className="text-end">Total Payé</th>
                                            <th className="text-end">Reste à Payer</th>
                                            <th className="text-center">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((student, index) => (
                                            <tr key={index}>
                                                <td>{student.numero}</td>
                                                <td>
                                                    <Badge bg="outline-primary" text="primary">
                                                        {student.matricule}
                                                    </Badge>
                                                </td>
                                                <td><strong>{student.nom}</strong></td>
                                                <td><strong>{student.prenom}</strong></td>
                                                <td className="text-end">
                                                    <span className="text-warning fw-bold">
                                                        {formatAmount(student.inscription)}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className="text-success fw-bold">
                                                        {formatAmount(student.tranche1)}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className="text-info fw-bold">
                                                        {formatAmount(student.tranche2)}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className="text-primary fw-bold">
                                                        {formatAmount(student.tranche3)}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className="text-secondary">
                                                        {formatAmount(student.rabais)}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className="text-secondary">
                                                        {formatAmount(student.bourse)}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className="text-success fw-bold">
                                                        {formatAmount(student.total_paye)}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <span className="text-danger fw-bold">
                                                        {formatAmount(student.reste_a_payer)}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    {student.reste_a_payer > 0 ? 
                                                        <Badge bg="warning">Partiel</Badge> : 
                                                        <Badge bg="success">Complet</Badge>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-secondary">
                                        <tr>
                                            <th colSpan={4} className="text-end">
                                                <strong>TOTAL ({summary.total_students} élèves) :</strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-warning fs-6">
                                                    {formatAmount(summary.totals?.inscription || 0)}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-success fs-6">
                                                    {formatAmount(summary.totals?.tranche1 || 0)}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-info fs-6">
                                                    {formatAmount(summary.totals?.tranche2 || 0)}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-primary fs-6">
                                                    {formatAmount(summary.totals?.tranche3 || 0)}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-secondary fs-6">
                                                    {formatAmount(payments.reduce((sum, student) => sum + student.rabais, 0))}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-secondary fs-6">
                                                    {formatAmount(payments.reduce((sum, student) => sum + student.bourse, 0))}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-success fs-5">
                                                    {formatAmount(payments.reduce((sum, student) => sum + student.total_paye, 0))}
                                                </strong>
                                            </th>
                                            <th className="text-end">
                                                <strong className="text-danger fs-5">
                                                    {formatAmount(payments.reduce((sum, student) => sum + student.reste_a_payer, 0))}
                                                </strong>
                                            </th>
                                            <th></th>
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

export default ClassSchoolFeesReport;