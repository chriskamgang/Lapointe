import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button,
    Spinner,
    Alert,
    Badge,
    InputGroup,
    Tabs,
    Tab,
    ListGroup
} from 'react-bootstrap';
import {
    Search as SearchIcon,
    Person,
    Building,
    Grid3x3Gap,
    Eye,
    Calendar,
    GeoAlt,
    Telephone,
    Envelope,
    ArrowRight,
    X,
    PersonFill,
    BookFill,
    JournalBookmarkFill
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../utils/apiMigration';
import { useAuth } from '../hooks/useAuth';

const Search = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState({
        students: [],
        classes: [],
        series: [],
        teachers: [],
        subjects: []
    });
    const [meta, setMeta] = useState({
        query: '',
        total_results: 0,
        categories: {
            students: 0,
            classes: 0,
            series: 0,
            teachers: 0,
            subjects: 0
        },
        is_admin: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    // Gérer la sélection d'onglet avec vérification des permissions
    const handleTabSelect = (tab) => {
        // Empêcher les non-admins d'accéder aux onglets enseignants et matières
        if (!meta.is_admin && (tab === 'teachers' || tab === 'subjects')) {
            return;
        }
        setActiveTab(tab);
    };

    // Effectuer la recherche au chargement si query est présente dans l'URL
    useEffect(() => {
        const urlQuery = searchParams.get('q');
        if (urlQuery && urlQuery.trim()) {
            setQuery(urlQuery);
            performSearch(urlQuery);
        }
    }, [searchParams]);

    const performSearch = async (searchQuery = query) => {
        if (!searchQuery.trim()) {
            setError('Veuillez saisir un terme de recherche');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setHasSearched(true);

            const response = await secureApiEndpoints.search.global(searchQuery.trim(), 20);
            
            if (response.success) {
                setResults(response.data);
                setMeta(response.meta);
                
                // Réinitialiser l'onglet actif si nécessaire
                if (!response.meta.is_admin && (activeTab === 'teachers' || activeTab === 'subjects')) {
                    setActiveTab('all');
                }
                
                // Mettre à jour l'URL
                setSearchParams({ q: searchQuery.trim() });
            } else {
                setError(response.message || 'Erreur lors de la recherche');
            }
        } catch (error) {
            console.error('Search error:', error);
            setError('Erreur lors de la recherche');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        performSearch();
    };

    const clearSearch = () => {
        setQuery('');
        setResults({ students: [], classes: [], series: [], teachers: [], subjects: [] });
        setMeta({ query: '', total_results: 0, categories: { students: 0, classes: 0, series: 0, teachers: 0, subjects: 0 }, is_admin: false });
        setError('');
        setHasSearched(false);
        setSearchParams({});
    };

    const renderStudents = (students) => {
        if (students.length === 0) {
            return (
                <div className="text-center py-3">
                    <Person size={32} className="text-muted mb-2" />
                    <p className="text-muted mb-0">Aucun étudiant trouvé</p>
                </div>
            );
        }

        return (
            <div className="border rounded bg-light p-3">
                {students.map((student, index) => (
                    <div key={student.id}>
                        <div className="d-flex align-items-center justify-content-between py-2">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="me-3">
                                    {student.photo_url ? (
                                        <img 
                                            src={student.photo_url} 
                                            alt={student.full_name}
                                            className="rounded-circle"
                                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div 
                                            className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '40px', height: '40px' }}
                                        >
                                            <Person className="text-primary" size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-1">
                                        <h6 className="mb-0 me-2">{student.full_name}</h6>
                                        <Badge bg={student.gender === 'M' ? 'info' : 'danger'} className="me-2">
                                            {student.gender === 'M' ? 'M' : 'F'}
                                        </Badge>
                                        <span className="text-muted small">Mat: {student.student_number}</span>
                                    </div>
                                    <div className="d-flex align-items-center text-muted small">
                                        <Building size={12} className="me-1" />
                                        <span className="me-3">{student.section_name} - {student.level_name} - {student.class_name} ({student.series_name})</span>
                                        {student.parent_name && (
                                            <>
                                                <Person size={12} className="me-1" />
                                                <span className="me-3">Parent: {student.parent_name}</span>
                                            </>
                                        )}
                                        {student.date_of_birth && (
                                            <>
                                                <Calendar size={12} className="me-1" />
                                                <span>
                                                    {new Date(student.date_of_birth).toLocaleDateString('fr-FR')}
                                                    {student.place_of_birth && ` à ${student.place_of_birth}`}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to={`/students/series/${student.series_id}`}
                                className="btn btn-sm btn-outline-primary ms-2"
                                title="Voir la série de l'étudiant"
                            >
                                <Eye size={14} className="me-1" />
                                Voir
                            </Link>
                        </div>
                        {index < students.length - 1 && <hr className="my-2" />}
                    </div>
                ))}
            </div>
        );
    };

    const renderClasses = (classes) => {
        if (classes.length === 0) {
            return (
                <div className="text-center py-3">
                    <Building size={32} className="text-muted mb-2" />
                    <p className="text-muted mb-0">Aucune classe trouvée</p>
                </div>
            );
        }

        return (
            <div className="border rounded bg-light p-3">
                {classes.map((schoolClass, index) => (
                    <div key={schoolClass.id}>
                        <div className="d-flex align-items-center justify-content-between py-2">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="me-3">
                                    <div 
                                        className="bg-success bg-opacity-10 rounded d-flex align-items-center justify-content-center"
                                        style={{ width: '40px', height: '40px' }}
                                    >
                                        <Building className="text-success" size={20} />
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-1">
                                        <h6 className="mb-0 me-2">{schoolClass.name}</h6>
                                        <Badge bg="success" className="me-2">
                                            {schoolClass.series_count} série{schoolClass.series_count > 1 ? 's' : ''}
                                        </Badge>
                                        <Badge bg="info">
                                            {schoolClass.total_students} élève{schoolClass.total_students > 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="d-flex align-items-center text-muted small">
                                        <span className="me-3">{schoolClass.section_name} - {schoolClass.level_name}</span>
                                        {schoolClass.description && (
                                            <span className="me-3">{schoolClass.description}</span>
                                        )}
                                        {schoolClass.series.length > 0 && (
                                            <span>
                                                Séries: {schoolClass.series.map(series => `${series.name} (${series.students_count})`).join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to={user?.role === 'admin' ? `/school-classes?search=${encodeURIComponent(schoolClass.name)}` : `/class-comp/${schoolClass.id}`}
                                className="btn btn-sm btn-outline-success ms-2"
                                title={user?.role === 'admin' ? "Voir la classe dans la liste" : "Voir les détails de la classe"}
                            >
                                <Eye size={14} className="me-1" />
                                Voir
                            </Link>
                        </div>
                        {index < classes.length - 1 && <hr className="my-2" />}
                    </div>
                ))}
            </div>
        );
    };

    const renderSeries = (series) => {
        if (series.length === 0) {
            return (
                <div className="text-center py-3">
                    <Grid3x3Gap size={32} className="text-muted mb-2" />
                    <p className="text-muted mb-0">Aucune série trouvée</p>
                </div>
            );
        }

        return (
            <div className="border rounded bg-light p-3">
                {series.map((serie, index) => (
                    <div key={serie.id}>
                        <div className="d-flex align-items-center justify-content-between py-2">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="me-3">
                                    <div 
                                        className="bg-info bg-opacity-10 rounded d-flex align-items-center justify-content-center"
                                        style={{ width: '40px', height: '40px' }}
                                    >
                                        <Grid3x3Gap className="text-info" size={20} />
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-1">
                                        <h6 className="mb-0 me-2">
                                            {serie.name}
                                            {serie.code && <span className="text-muted"> ({serie.code})</span>}
                                        </h6>
                                        <Badge bg="info" className="me-2">
                                            {serie.students_count} élève{serie.students_count > 1 ? 's' : ''}
                                        </Badge>
                                        <Badge bg="secondary">
                                            Cap: {serie.capacity}
                                        </Badge>
                                    </div>
                                    <div className="d-flex align-items-center text-muted small">
                                        <Building size={12} className="me-1" />
                                        <span className="me-3">{serie.class_name} - {serie.section_name} - {serie.level_name}</span>
                                        {serie.main_teacher && (
                                            <span>Prof. principal: {serie.main_teacher}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to={`/students/series/${serie.id}`}
                                className="btn btn-sm btn-outline-info ms-2"
                                title="Voir les élèves de la série"
                            >
                                <Eye size={14} className="me-1" />
                                Voir
                            </Link>
                        </div>
                        {index < series.length - 1 && <hr className="my-2" />}
                    </div>
                ))}
            </div>
        );
    };

    const renderTeachers = (teachers) => {
        if (teachers.length === 0) {
            return (
                <div className="text-center py-3">
                    <PersonFill size={32} className="text-muted mb-2" />
                    <p className="text-muted mb-0">Aucun enseignant trouvé</p>
                </div>
            );
        }

        return (
            <div className="border rounded bg-light p-3">
                {teachers.map((teacher, index) => (
                    <div key={teacher.id}>
                        <div className="d-flex align-items-center justify-content-between py-2">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="me-3">
                                    {teacher.photo_url ? (
                                        <img 
                                            src={teacher.photo_url} 
                                            alt={teacher.name}
                                            className="rounded-circle"
                                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div 
                                            className="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '40px', height: '40px' }}
                                        >
                                            <PersonFill className="text-warning" size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-1">
                                        <h6 className="mb-0 me-2">{teacher.name}</h6>
                                        {teacher.specialty && (
                                            <Badge bg="warning" text="dark" className="me-2">
                                                {teacher.specialty}
                                            </Badge>
                                        )}
                                        <Badge bg={teacher.is_active ? 'success' : 'danger'}>
                                            {teacher.is_active ? 'Actif' : 'Inactif'}
                                        </Badge>
                                    </div>
                                    <div className="d-flex align-items-center text-muted small">
                                        {teacher.email && (
                                            <>
                                                <Envelope size={12} className="me-1" />
                                                <span className="me-3">{teacher.email}</span>
                                            </>
                                        )}
                                        {teacher.phone && (
                                            <>
                                                <Telephone size={12} className="me-1" />
                                                <span>{teacher.phone}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to={`/teachers?search=${encodeURIComponent(teacher.name)}`}
                                className="btn btn-sm btn-outline-warning ms-2"
                                title="Voir l'enseignant dans la liste"
                            >
                                <Eye size={14} className="me-1" />
                                Voir
                            </Link>
                        </div>
                        {index < teachers.length - 1 && <hr className="my-2" />}
                    </div>
                ))}
            </div>
        );
    };

    const renderSubjects = (subjects) => {
        if (subjects.length === 0) {
            return (
                <div className="text-center py-3">
                    <JournalBookmarkFill size={32} className="text-muted mb-2" />
                    <p className="text-muted mb-0">Aucune matière trouvée</p>
                </div>
            );
        }

        return (
            <div className="border rounded bg-light p-3">
                {subjects.map((subject, index) => (
                    <div key={subject.id}>
                        <div className="d-flex align-items-center justify-content-between py-2">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="me-3">
                                    <div 
                                        className="bg-dark bg-opacity-10 rounded d-flex align-items-center justify-content-center"
                                        style={{ width: '40px', height: '40px' }}
                                    >
                                        <JournalBookmarkFill className="text-dark" size={20} />
                                    </div>
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-1">
                                        <h6 className="mb-0 me-2">{subject.name}</h6>
                                        {subject.code && (
                                            <Badge bg="dark" className="me-2">
                                                {subject.code}
                                            </Badge>
                                        )}
                                        {subject.coefficient && (
                                            <Badge bg="secondary">
                                                Coeff: {subject.coefficient}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="d-flex align-items-center text-muted small">
                                        {subject.description && (
                                            <span>{subject.description}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link
                                to={`/subjects?search=${encodeURIComponent(subject.name)}`}
                                className="btn btn-sm btn-outline-dark ms-2"
                                title="Voir la matière dans la liste"
                            >
                                <Eye size={14} className="me-1" />
                                Voir
                            </Link>
                        </div>
                        {index < subjects.length - 1 && <hr className="my-2" />}
                    </div>
                ))}
            </div>
        );
    };

    const getAllResults = () => {
        const allResults = [
            ...results.students.map(item => ({ ...item, category: 'student' })),
            ...results.classes.map(item => ({ ...item, category: 'class' })),
            ...results.series.map(item => ({ ...item, category: 'series' }))
        ];
        
        if (meta.is_admin) {
            allResults.push(
                ...results.teachers.map(item => ({ ...item, category: 'teacher' })),
                ...results.subjects.map(item => ({ ...item, category: 'subject' }))
            );
        }
        
        return allResults;
    };

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="h4 mb-1 d-flex align-items-center">
                                <SearchIcon size={24} className="me-2" />
                                Recherche Globale
                            </h2>
                            <p className="text-muted mb-0">
                                Recherchez des étudiants, classes et séries
                            </p>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Search Form */}
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <InputGroup size="lg">
                                    <Form.Control
                                        type="text"
                                        placeholder="Tapez votre recherche (nom, prénom, matricule, classe, série...)"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        disabled={loading}
                                    />
                                    {query && (
                                        <Button 
                                            variant="outline-secondary"
                                            onClick={clearSearch}
                                            disabled={loading}
                                        >
                                            <X size={16} />
                                        </Button>
                                    )}
                                    <Button 
                                        variant="primary" 
                                        type="submit" 
                                        disabled={loading || !query.trim()}
                                    >
                                        {loading ? (
                                            <Spinner animation="border" size="sm" />
                                        ) : (
                                            <SearchIcon size={16} />
                                        )}
                                    </Button>
                                </InputGroup>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Error Alert */}
            {error && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant="danger" dismissible onClose={() => setError('')}>
                            {error}
                        </Alert>
                    </Col>
                </Row>
            )}

            {/* Results */}
            {hasSearched && !loading && (
                <Row>
                    <Col>
                        <Card>
                            <Card.Header>
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0">
                                        Résultats de recherche
                                        {meta.query && <span className="text-muted"> pour "{meta.query}"</span>}
                                    </h5>
                                    <Badge bg="primary">{meta.total_results} résultat{meta.total_results > 1 ? 's' : ''}</Badge>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                {meta.total_results === 0 ? (
                                    <div className="text-center py-5">
                                        <SearchIcon size={48} className="text-muted mb-3" />
                                        <h5 className="text-muted">Aucun résultat trouvé</h5>
                                        <p className="text-muted">
                                            Essayez avec d'autres mots-clés ou vérifiez l'orthographe
                                        </p>
                                    </div>
                                ) : (
                                    <Tabs activeKey={activeTab} onSelect={handleTabSelect}>
                                        <Tab 
                                            eventKey="all" 
                                            title={`Tous (${meta.total_results})`}
                                        >
                                            <div className="mt-3">
                                                {/* Students */}
                                                {meta.categories.students > 0 && (
                                                    <div className="mb-5">
                                                        <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                                                            <Person size={20} className="me-2 text-primary" />
                                                            <h5 className="mb-0 text-primary">
                                                                Étudiants
                                                            </h5>
                                                            <Badge bg="primary" className="ms-2">
                                                                {meta.categories.students}
                                                            </Badge>
                                                        </div>
                                                        {renderStudents(results.students)}
                                                    </div>
                                                )}

                                                {/* Classes */}
                                                {meta.categories.classes > 0 && (
                                                    <div className="mb-5">
                                                        <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                                                            <Building size={20} className="me-2 text-success" />
                                                            <h5 className="mb-0 text-success">
                                                                Classes
                                                            </h5>
                                                            <Badge bg="success" className="ms-2">
                                                                {meta.categories.classes}
                                                            </Badge>
                                                        </div>
                                                        {renderClasses(results.classes)}
                                                    </div>
                                                )}

                                                {/* Series */}
                                                {meta.categories.series > 0 && (
                                                    <div className="mb-5">
                                                        <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                                                            <Grid3x3Gap size={20} className="me-2 text-info" />
                                                            <h5 className="mb-0 text-info">
                                                                Séries
                                                            </h5>
                                                            <Badge bg="info" className="ms-2">
                                                                {meta.categories.series}
                                                            </Badge>
                                                        </div>
                                                        {renderSeries(results.series)}
                                                    </div>
                                                )}

                                                {/* Teachers - Admin only */}
                                                {meta.is_admin && meta.categories.teachers > 0 && (
                                                    <div className="mb-5">
                                                        <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                                                            <PersonFill size={20} className="me-2 text-warning" />
                                                            <h5 className="mb-0 text-warning">
                                                                Enseignants
                                                            </h5>
                                                            <Badge bg="warning" text="dark" className="ms-2">
                                                                {meta.categories.teachers}
                                                            </Badge>
                                                        </div>
                                                        {renderTeachers(results.teachers)}
                                                    </div>
                                                )}

                                                {/* Subjects - Admin only */}
                                                {meta.is_admin && meta.categories.subjects > 0 && (
                                                    <div className="mb-4">
                                                        <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                                                            <JournalBookmarkFill size={20} className="me-2 text-dark" />
                                                            <h5 className="mb-0 text-dark">
                                                                Matières
                                                            </h5>
                                                            <Badge bg="dark" className="ms-2">
                                                                {meta.categories.subjects}
                                                            </Badge>
                                                        </div>
                                                        {renderSubjects(results.subjects)}
                                                    </div>
                                                )}
                                            </div>
                                        </Tab>

                                        <Tab 
                                            eventKey="students" 
                                            title={`Étudiants (${meta.categories.students})`}
                                            disabled={meta.categories.students === 0}
                                        >
                                            <div className="mt-3">
                                                {renderStudents(results.students)}
                                            </div>
                                        </Tab>

                                        <Tab 
                                            eventKey="classes" 
                                            title={`Classes (${meta.categories.classes})`}
                                            disabled={meta.categories.classes === 0}
                                        >
                                            <div className="mt-3">
                                                {renderClasses(results.classes)}
                                            </div>
                                        </Tab>

                                        <Tab 
                                            eventKey="series" 
                                            title={`Séries (${meta.categories.series})`}
                                            disabled={meta.categories.series === 0}
                                        >
                                            <div className="mt-3">
                                                {renderSeries(results.series)}
                                            </div>
                                        </Tab>

                                        {/* Onglets admin uniquement */}
                                        {meta.is_admin && (
                                            <Tab 
                                                eventKey="teachers" 
                                                title={`Enseignants (${meta.categories.teachers || 0})`}
                                                disabled={meta.categories.teachers === 0}
                                            >
                                                <div className="mt-3">
                                                    {renderTeachers(results.teachers)}
                                                </div>
                                            </Tab>
                                        )}

                                        {meta.is_admin && (
                                            <Tab 
                                                eventKey="subjects" 
                                                title={`Matières (${meta.categories.subjects || 0})`}
                                                disabled={meta.categories.subjects === 0}
                                            >
                                                <div className="mt-3">
                                                    {renderSubjects(results.subjects)}
                                                </div>
                                            </Tab>
                                        )}
                                    </Tabs>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default Search;