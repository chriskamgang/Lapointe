import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    HouseHeartFill,
    PeopleFill,
    Search,
    Grid,
    List,
    InfoCircle,
    Building,
    ChevronDown,
    ChevronRight,
    Eye
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';

const AccountantClasses = () => {
    const navigate = useNavigate();
    
    const [classes, setClasses] = useState([]);
    const [groupedClasses, setGroupedClasses] = useState({});
    const [expandedClasses, setExpandedClasses] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grouped');
    const [stats, setStats] = useState({
        total_students: 0,
        total_classes: 0,
        total_series: 0
    });

    useEffect(() => {
        loadClasses();
        loadDashboard();
    }, []);

    const loadClasses = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.accountant.getClasses();
            
            if (response.success) {
                const classes = response.data?.classes || response.data || [];
                const groupedClasses = response.data?.grouped_classes || {};
                
                setClasses(classes);
                setGroupedClasses(groupedClasses);
                
                // Si pas de données groupées, créer un groupement simple
                if (Object.keys(groupedClasses).length === 0 && classes.length > 0) {
                    const simpleGrouped = classes.reduce((acc, classe) => {
                        const groupKey = `${classe.level?.section?.name || 'Section inconnue'} - ${classe.level?.name || 'Niveau inconnu'}`;
                        if (!acc[groupKey]) {
                            acc[groupKey] = [];
                        }
                        acc[groupKey].push(classe);
                        return acc;
                    }, {});
                    setGroupedClasses(simpleGrouped);
                }
            } else {
                setError(response.message || 'Erreur lors du chargement des classes');
            }
        } catch (error) {
            console.error('Error loading classes:', error);
            setError('Erreur lors du chargement des classes');
        } finally {
            setLoading(false);
        }
    };

    const loadDashboard = async () => {
        try {
            const response = await secureApiEndpoints.accountant.dashboard();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    // Fonction pour gérer l'expansion des classes
    const toggleClassExpansion = (classId) => {
        setExpandedClasses(prev => ({
            ...prev,
            [classId]: !prev[classId]
        }));
    };

    // Filtrer les classes selon la recherche
    const filteredClasses = classes.filter(classe =>
        classe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classe.level?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classe.level?.section?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filtrer les classes groupées selon la recherche
    const filteredGroupedClasses = Object.keys(groupedClasses).reduce((acc, sectionKey) => {
        const sectionData = groupedClasses[sectionKey];
        
        // Si sectionData est un objet avec des niveaux
        if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
            const filteredSection = {};
            
            Object.keys(sectionData).forEach(levelKey => {
                const levelClasses = Array.isArray(sectionData[levelKey]) ? sectionData[levelKey] : [];
                const filteredLevelClasses = levelClasses.filter(classe =>
                    classe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    classe.level?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    classe.level?.section?.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
                
                if (filteredLevelClasses.length > 0) {
                    filteredSection[levelKey] = filteredLevelClasses;
                }
            });
            
            if (Object.keys(filteredSection).length > 0) {
                acc[sectionKey] = filteredSection;
            }
        }
        // Si sectionData est directement un array (fallback)
        else if (Array.isArray(sectionData)) {
            const filteredGroupClasses = sectionData.filter(classe =>
                classe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                classe.level?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                classe.level?.section?.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredGroupClasses.length > 0) {
                acc[sectionKey] = filteredGroupClasses;
            }
        }
        
        return acc;
    }, {});

    if (loading && classes.length === 0) {
        return (
            <div className="container-fluid py-4">
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Chargement des classes...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="h4 mb-1">Gestion des Classes</h2>
                            <p className="text-muted mb-0">
                                Visualisation des classes et gestion des élèves (Mode Comptable)
                            </p>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-info">
                                <InfoCircle size={14} className="me-1" />
                                Lecture seule
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            {error}
                            <button 
                                type="button" 
                                className="btn-close" 
                                onClick={() => setError('')}
                                aria-label="Close"
                            ></button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card bg-primary text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <div className="fs-2 fw-bold">{stats.total_students}</div>
                                    <div>Élèves Total</div>
                                </div>
                                <PeopleFill size={40} className="opacity-75" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-success text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <div className="fs-2 fw-bold">{stats.total_classes}</div>
                                    <div>Classes</div>
                                </div>
                                <HouseHeartFill size={40} className="opacity-75" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-warning text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <div className="fs-2 fw-bold">{stats.total_series}</div>
                                    <div>Séries</div>
                                </div>
                                <Grid size={40} className="opacity-75" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-info text-white">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <div className="fs-6 fw-bold">{stats.current_year}</div>
                                    <div>Année Scolaire</div>
                                </div>
                                <InfoCircle size={40} className="opacity-75" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <label className="form-label">Rechercher</label>
                                    <div className="position-relative">
                                        <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                        <input
                                            type="text"
                                            className="form-control ps-5"
                                            placeholder="Rechercher par nom de classe, niveau ou section..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-4 d-flex align-items-end">
                                    <div className="btn-group w-100" role="group">
                                        <button
                                            type="button"
                                            className={`btn ${viewMode === 'grouped' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setViewMode('grouped')}
                                        >
                                            <Building size={16} className="me-1" />
                                            Groupé
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setViewMode('grid')}
                                        >
                                            <Grid size={16} className="me-1" />
                                            Grille
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setViewMode('list')}
                                        >
                                            <List size={16} className="me-1" />
                                            Liste
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Classes Display */}
            {viewMode === 'grouped' ? (
                // Vue groupée par sections et classes
                <div className="row">
                    <div className="col-12">
                        {Object.keys(filteredGroupedClasses).length === 0 ? (
                            <div className="card">
                                <div className="card-body text-center py-5">
                                    <HouseHeartFill size={48} className="text-muted mb-3" />
                                    <h5 className="text-muted">Aucune classe trouvée</h5>
                                    <p className="text-muted">
                                        {searchTerm 
                                            ? 'Aucune classe ne correspond à vos critères de recherche.'
                                            : 'Aucune classe disponible pour le moment.'
                                        }
                                    </p>
                                    {!searchTerm && Object.keys(groupedClasses).length === 0 && classes.length === 0 && (
                                        <div className="mt-3">
                                            <small className="text-muted">
                                                Vérifiez que des classes ont été créées dans l'administration.
                                            </small>
                                        </div>
                                    )}
                                    {!searchTerm && Object.keys(groupedClasses).length === 0 && classes.length > 0 && (
                                        <div className="mt-3">
                                            <button 
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => setViewMode('grid')}
                                            >
                                                Voir en mode grille
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="accordion" id="classesAccordion">
                                {Object.entries(filteredGroupedClasses).map(([sectionKey, sectionData], sectionIndex) => (
                                    <div key={sectionKey} className="card mb-3">
                                        <div className="card-header bg-primary text-white">
                                            <h5 className="mb-0 d-flex align-items-center">
                                                <Building size={18} className="me-2" />
                                                {sectionKey}
                                                <span className="badge bg-light text-dark ms-2">
                                                    {typeof sectionData === 'object' && !Array.isArray(sectionData) 
                                                        ? Object.values(sectionData).reduce((total, levelClasses) => total + (Array.isArray(levelClasses) ? levelClasses.length : 0), 0)
                                                        : Array.isArray(sectionData) ? sectionData.length : 0
                                                    } classe{(typeof sectionData === 'object' && !Array.isArray(sectionData) 
                                                        ? Object.values(sectionData).reduce((total, levelClasses) => total + (Array.isArray(levelClasses) ? levelClasses.length : 0), 0)
                                                        : Array.isArray(sectionData) ? sectionData.length : 0
                                                    ) > 1 ? 's' : ''}
                                                </span>
                                            </h5>
                                        </div>
                                        <div className="card-body p-0">
                                            {typeof sectionData === 'object' && !Array.isArray(sectionData) ? (
                                                // Structure hiérarchique : Section > Niveau > Classes
                                                Object.entries(sectionData).map(([levelKey, levelClasses]) => {
                                                    const levelClassesArray = Array.isArray(levelClasses) ? levelClasses : [];
                                                    return (
                                                        <div key={levelKey} className="border-bottom">
                                                            <div className="bg-light p-3">
                                                                <h6 className="mb-0 text-secondary">
                                                                    <Grid size={16} className="me-2" />
                                                                    {levelKey}
                                                                    <span className="badge bg-secondary ms-2">
                                                                        {levelClassesArray.length} classe{levelClassesArray.length > 1 ? 's' : ''}
                                                                    </span>
                                                                </h6>
                                                            </div>
                                                            {levelClassesArray.map((classItem) => (
                                                <div key={classItem.id} className="border-bottom">
                                                    {/* En-tête de la classe */}
                                                    <div 
                                                        className="p-3 d-flex justify-content-between align-items-center cursor-pointer"
                                                        onClick={() => toggleClassExpansion(classItem.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div className="d-flex align-items-center">
                                                            {expandedClasses[classItem.id] ? 
                                                                <ChevronDown size={16} className="me-2 text-muted" /> :
                                                                <ChevronRight size={16} className="me-2 text-muted" />
                                                            }
                                                            <div>
                                                                <h6 className="mb-1">{classItem.name}</h6>
                                                                <small className="text-muted">
                                                                    {classItem.series_count || 0} série{(classItem.series_count || 0) > 1 ? 's' : ''} • {classItem.total_students || 0} élève{(classItem.total_students || 0) > 1 ? 's' : ''}
                                                                </small>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex gap-2">
                                                            <Link
                                                                to={`/class-comp/${classItem.id}`}
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="Voir les séries"
                                                            >
                                                                <Eye size={14} />
                                                            </Link>
                                                        </div>
                                                    </div>

                                                    {/* Détails de la classe (séries) */}
                                                    {expandedClasses[classItem.id] && (
                                                        <div className="px-3 pb-3">
                                                            <div className="row">
                                                                <div className="col-12">
                                                                    <h6 className="text-primary mb-3">
                                                                        <PeopleFill size={16} className="me-2" />
                                                                        Séries
                                                                    </h6>
                                                                    {classItem.series && classItem.series.length > 0 ? (
                                                                        <div className="list-group list-group-flush">
                                                                            {classItem.series.map((serie) => (
                                                                                <div key={serie.id} className="list-group-item border-0 px-0 py-2">
                                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                                        <div>
                                                                                            <span className="fw-medium">{serie.name}</span>
                                                                                            <small className="text-muted ms-2">
                                                                                                {serie.students_count || 0} élève{(serie.students_count || 0) > 1 ? 's' : ''}
                                                                                            </small>
                                                                                        </div>
                                                                                        <Link
                                                                                            to={`/students/series/${serie.id}`}
                                                                                            className="btn btn-sm btn-outline-success"
                                                                                        >
                                                                                            Voir élèves
                                                                                        </Link>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-muted">Aucune série configurée</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                // Structure simple : Section > Classes directement
                                                Array.isArray(sectionData) ? sectionData.map((classItem) => (
                                                    <div key={classItem.id} className="border-bottom">
                                                        {/* En-tête de la classe */}
                                                        <div 
                                                            className="p-3 d-flex justify-content-between align-items-center cursor-pointer"
                                                            onClick={() => toggleClassExpansion(classItem.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex align-items-center">
                                                                {expandedClasses[classItem.id] ? 
                                                                    <ChevronDown size={16} className="me-2 text-muted" /> :
                                                                    <ChevronRight size={16} className="me-2 text-muted" />
                                                                }
                                                                <div>
                                                                    <h6 className="mb-1">{classItem.name}</h6>
                                                                    <small className="text-muted">
                                                                        {classItem.series_count || 0} série{(classItem.series_count || 0) > 1 ? 's' : ''} • {classItem.total_students || 0} élève{(classItem.total_students || 0) > 1 ? 's' : ''}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex gap-2">
                                                                <Link
                                                                    to={`/class-comp/${classItem.id}`}
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    title="Voir les séries"
                                                                >
                                                                    <Eye size={14} />
                                                                </Link>
                                                            </div>
                                                        </div>

                                                        {/* Détails de la classe (séries) */}
                                                        {expandedClasses[classItem.id] && (
                                                            <div className="px-3 pb-3">
                                                                <div className="row">
                                                                    <div className="col-12">
                                                                        <h6 className="text-primary mb-3">
                                                                            <PeopleFill size={16} className="me-2" />
                                                                            Séries
                                                                        </h6>
                                                                        {classItem.series && classItem.series.length > 0 ? (
                                                                            <div className="list-group list-group-flush">
                                                                                {classItem.series.map((serie) => (
                                                                                    <div key={serie.id} className="list-group-item border-0 px-0 py-2">
                                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                                            <div>
                                                                                                <span className="fw-medium">{serie.name}</span>
                                                                                                <small className="text-muted ms-2">
                                                                                                    {serie.students_count || 0} élève{(serie.students_count || 0) > 1 ? 's' : ''}
                                                                                                </small>
                                                                                            </div>
                                                                                            <Link
                                                                                                to={`/students/series/${serie.id}`}
                                                                                                className="btn btn-sm btn-outline-success"
                                                                                            >
                                                                                                Voir élèves
                                                                                            </Link>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-muted">Aucune série configurée</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )) : null
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="row">
                    {filteredClasses.length === 0 ? (
                        <div className="col-12">
                            <div className="card">
                                <div className="card-body text-center py-5">
                                    <HouseHeartFill size={48} className="text-muted mb-3" />
                                    <h5 className="text-muted">Aucune classe trouvée</h5>
                                    <p className="text-muted">
                                        {searchTerm 
                                            ? 'Aucune classe ne correspond à vos critères de recherche.'
                                            : 'Aucune classe disponible pour le moment.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        filteredClasses.map((classe) => (
                            <div key={classe.id} className="col-md-6 col-lg-4 mb-4">
                                <div className="card h-100 hover-card">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h6 className="card-title mb-1">{classe.name}</h6>
                                                <small className="text-muted">
                                                    {classe.level?.section?.name} - {classe.level?.name}
                                                </small>
                                            </div>
                                            <span className="badge bg-primary">
                                                {classe.series_count || 0} série{(classe.series_count || 0) > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between align-items-center mt-auto">
                                            <small className="text-muted">
                                                {classe.total_students || 0} élève{(classe.total_students || 0) > 1 ? 's' : ''}
                                            </small>
                                            <Link
                                                to={`/class-comp/${classe.id}`}
                                                className="btn btn-primary btn-sm"
                                            >
                                                Voir les séries
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                // Liste view
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Classe</th>
                                                <th>Section</th>
                                                <th>Niveau</th>
                                                <th>Séries</th>
                                                <th>Élèves</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredClasses.map((classe) => (
                                                <tr key={classe.id}>
                                                    <td className="fw-medium">{classe.name}</td>
                                                    <td>{classe.level?.section?.name}</td>
                                                    <td>{classe.level?.name}</td>
                                                    <td>
                                                        <span className="badge bg-light text-dark">
                                                            {classe.series_count || 0} série{(classe.series_count || 0) > 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td>{classe.total_students || 0} élève{(classe.total_students || 0) > 1 ? 's' : ''}</td>
                                                    <td>
                                                        <Link
                                                            to={`/class-comp/${classe.id}`}
                                                            className="btn btn-sm btn-primary"
                                                        >
                                                            Voir les séries
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for hover effects */}
            <style jsx>{`
                .hover-card {
                    transition: box-shadow 0.2s ease-in-out;
                }
                .hover-card:hover {
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
                }
            `}</style>
        </div>
    );
};

export default AccountantClasses;