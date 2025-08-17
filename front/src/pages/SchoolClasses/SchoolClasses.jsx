import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    PencilSquare, 
    Trash, 
    People, 
    CreditCard,
    ChevronDown,
    ChevronRight,
    Building,
    Eye
    // BookOpen
} from 'react-bootstrap-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { secureApiEndpoints } from '../../utils/apiMigration';
import ImportExportButton from '../../components/ImportExportButton';
import CreateSchoolClass from './CreateSchoolClass';
import EditSchoolClass from './EditSchoolClass';
import Swal from 'sweetalert2';

const SchoolClasses = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [levels, setLevels] = useState([]);
    const [expandedClasses, setExpandedClasses] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [filters, setFilters] = useState({
        section_id: '',
        level_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            loadInitialData();
        }
    }, [isAuthenticated, authLoading]);

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            loadClasses();
        }
    }, [filters, isAuthenticated, authLoading]);

    const loadInitialData = async () => {
        try {
            console.log('Loading initial data - sections and levels...');
            const [sectionsResponse, levelsResponse] = await Promise.all([
                secureApiEndpoints.sections.getAll(),
                secureApiEndpoints.levels.getAll()
            ]);
            
            console.log('Sections response:', sectionsResponse);
            console.log('Levels response:', levelsResponse);
            
            if (sectionsResponse.success) {
                setSections(sectionsResponse.data || []);
            }
            if (levelsResponse.success) {
                setLevels(levelsResponse.data || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            setError('Erreur lors du chargement des sections et niveaux');
        }
    };

    const loadClasses = async () => {
        try {
            setLoading(true);
            console.log('Loading classes with filters:', filters);
            let response;
            
            if (filters.section_id) {
                response = await secureApiEndpoints.schoolClasses.getBySection(filters.section_id);
            } else if (filters.level_id) {
                response = await secureApiEndpoints.schoolClasses.getByLevel(filters.level_id);
            } else {
                response = await secureApiEndpoints.schoolClasses.getAll();
            }
            
            console.log('Classes response:', response);
            if (response.success) {
                setClasses(response.data || []);
            } else {
                setError(response.message || 'Erreur lors du chargement des classes');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des classes:', error);
            setError('Erreur lors du chargement des classes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = () => {
        setShowCreateModal(true);
    };

    const handleEditClass = (classItem) => {
        setSelectedClass(classItem);
        setShowEditModal(true);
    };

    const handleDeleteClass = async (classItem) => {
        const result = await Swal.fire({
            title: 'Confirmer la suppression',
            text: `Êtes-vous sûr de vouloir supprimer la classe "${classItem.name}" ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler'
        });

        if (result.isConfirmed) {
            try {
                const response = await secureApiEndpoints.schoolClasses.delete(classItem.id);
                if (response.success) {
                    loadClasses();
                    Swal.fire('Supprimé!', 'La classe a été supprimée.', 'success');
                } else {
                    Swal.fire('Erreur!', response.message || 'Erreur lors de la suppression.', 'error');
                }
            } catch (error) {
                Swal.fire('Erreur!', 'Erreur lors de la suppression.', 'error');
            }
        }
    };

    const toggleClassExpansion = (classId) => {
        setExpandedClasses(prev => ({
            ...prev,
            [classId]: !prev[classId]
        }));
    };

    const handleViewStudents = (seriesId) => {
        navigate(`/students/series/${seriesId}`);
    };

    const getSectionName = (sectionId) => {
        const section = sections.find(s => s.id === sectionId);
        return section ? section.name : 'Section inconnue';
    };

    const getLevelName = (levelId) => {
        const level = levels.find(l => l.id === levelId);
        return level ? level.name : 'Niveau inconnu';
    };

    const getFilteredLevels = () => {
        if (!filters.section_id) return levels;
        return levels.filter(level => level.section_id === parseInt(filters.section_id));
    };

    const groupedClasses = classes.reduce((acc, classItem) => {
        const key = `${classItem.level?.section?.name || 'Sans section'} - ${classItem.level?.name || 'Sans niveau'}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(classItem);
        return acc;
    }, {});

    // Afficher un loader si l'authentification est en cours
    if (authLoading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Chargement de l'authentification...</span>
                </div>
            </div>
        );
    }

    // Rediriger vers la page de connexion si pas authentifié
    if (!isAuthenticated) {
        return (
            <div className="text-center py-5">
                <h5 className="text-muted">Vous devez être connecté pour accéder à cette page</h5>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="h4 mb-1">Gestion des Classes</h2>
                            <p className="text-muted mb-0">
                                Gérez les classes, leurs séries et montants de paiement
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <ImportExportButton
                                title="Classes"
                                apiBasePath="/api/school-classes"
                                onImportSuccess={loadClasses}
                                filters={filters}
                                templateFileName="template_classes.csv"
                            />
                            <button
                                className="btn btn-primary d-flex align-items-center gap-2"
                                onClick={handleCreateClass}
                            >
                                <Plus size={16} />
                                Nouvelle Classe
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtres */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label">Section</label>
                                    <select
                                        className="form-select"
                                        value={filters.section_id}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            section_id: e.target.value,
                                            level_id: '' // Reset level when section changes
                                        }))}
                                    >
                                        <option value="">Toutes les sections</option>
                                        {sections.map(section => (
                                            <option key={section.id} value={section.id}>
                                                {section.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Niveau</label>
                                    <select
                                        className="form-select"
                                        value={filters.level_id}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            level_id: e.target.value
                                        }))}
                                    >
                                        <option value="">Tous les niveaux</option>
                                        {getFilteredLevels().map(level => (
                                            <option key={level.id} value={level.id}>
                                                {level.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-4 d-flex align-items-end">
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setFilters({ section_id: '', level_id: '' })}
                                    >
                                        Réinitialiser
                                    </button>
                                </div>
                            </div>
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

            {/* Liste des classes groupées */}
            <div className="row">
                <div className="col-12">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                    ) : Object.keys(groupedClasses).length === 0 ? (
                        <div className="card">
                            <div className="card-body text-center py-5">
                                {/* <BookOpen size={48} className="text-muted mb-3" /> */}
                                <h5 className="text-muted">Aucune classe trouvée</h5>
                                <p className="text-muted mb-4">
                                    Commencez par créer votre première classe
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateClass}
                                >
                                    <Plus size={16} className="me-2" />
                                    Créer une classe
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="accordion" id="classesAccordion">
                            {Object.entries(groupedClasses).map(([groupKey, groupClasses], groupIndex) => (
                                <div key={groupKey} className="card mb-3">
                                    <div className="card-header bg-light">
                                        <h6 className="mb-0 d-flex align-items-center">
                                            <Building size={16} className="me-2 text-primary" />
                                            {groupKey}
                                            <span className="badge bg-primary ms-2">
                                                {groupClasses.length} classe{groupClasses.length > 1 ? 's' : ''}
                                            </span>
                                        </h6>
                                    </div>
                                    <div className="card-body p-0">
                                        {groupClasses.map((classItem) => (
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
                                                                {classItem.series?.length || 0} série{(classItem.series?.length || 0) > 1 ? 's' : ''}
                                                                {classItem.payment_amounts?.length > 0 && (
                                                                    <> • {classItem.payment_amounts.length} tranche{classItem.payment_amounts.length > 1 ? 's' : ''} configurée{classItem.payment_amounts.length > 1 ? 's' : ''}</>
                                                                )}
                                                            </small>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditClass(classItem);
                                                            }}
                                                            title="Modifier"
                                                        >
                                                            <PencilSquare size={14} />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteClass(classItem);
                                                            }}
                                                            title="Supprimer"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Détails de la classe (séries et paiements) */}
                                                {expandedClasses[classItem.id] && (
                                                    <div className="px-3 pb-3">
                                                        <div className="row">
                                                            {/* Séries */}
                                                            <div className="col-md-6">
                                                                <h6 className="text-primary mb-3">
                                                                    <People size={16} className="me-2" />
                                                                    Séries
                                                                </h6>
                                                                {classItem.series && classItem.series.length > 0 ? (
                                                                    <div className="list-group list-group-flush">
                                                                        {classItem.series.map((serie) => (
                                                                            <div key={serie.id} className="list-group-item border-0 px-0 py-2">
                                                                                <div className="d-flex justify-content-between align-items-center">
                                                                                    <div className="flex-grow-1">
                                                                                        <strong>{serie.name}</strong>
                                                                                        {serie.code && (
                                                                                            <small className="text-muted ms-2">({serie.code})</small>
                                                                                        )}
                                                                                        <div className="small text-muted">
                                                                                            Capacité: {serie.capacity || 'Non définie'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-end">
                                                                                        <div className="mb-2">
                                                                                            <span className={`badge ${serie.is_active ? 'bg-success' : 'bg-secondary'} me-2`}>
                                                                                                {serie.is_active ? 'Active' : 'Inactive'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <button
                                                                                            className="btn btn-sm btn-outline-info"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleViewStudents(serie.id);
                                                                                            }}
                                                                                            title="Voir les élèves"
                                                                                        >
                                                                                            <Eye size={12} className="me-1" />
                                                                                            Élèves
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-muted">Aucune série configurée</p>
                                                                )}
                                                            </div>

                                                            {/* Montants de paiement */}
                                                            <div className="col-md-6">
                                                                <h6 className="text-success mb-3">
                                                                    <CreditCard size={16} className="me-2" />
                                                                    Montants de Paiement
                                                                </h6>
                                                                {classItem.payment_amounts && classItem.payment_amounts.length > 0 ? (
                                                                    <div className="list-group list-group-flush">
                                                                        {classItem.payment_amounts.map((payment) => (
                                                                            <div key={payment.id} className="list-group-item border-0 px-0 py-2">
                                                                                <div className="d-flex justify-content-between align-items-center">
                                                                                    <div>
                                                                                        <strong>{payment.payment_tranche?.name}</strong>
                                                                                        <br />
                                                                                        <small className="text-muted">
                                                                                            {payment.payment_tranche?.description}
                                                                                        </small>
                                                                                    </div>
                                                                                    <div className="text-end">
                                                                                        <div className="fw-bold text-success">
                                                                                            {parseFloat(payment.amount)?.toLocaleString()} FCFA
                                                                                        </div>
                                                                                        <small className="text-muted">
                                                                                            {payment.is_required ? 'Obligatoire' : 'Optionnel'}
                                                                                        </small>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-muted">Aucun montant configuré</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateSchoolClass
                    show={showCreateModal}
                    onHide={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadClasses();
                    }}
                    sections={sections}
                    levels={levels}
                />
            )}

            {showEditModal && selectedClass && (
                <EditSchoolClass
                    show={showEditModal}
                    onHide={() => {
                        setShowEditModal(false);
                        setSelectedClass(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedClass(null);
                        loadClasses();
                    }}
                    classData={selectedClass}
                    sections={sections}
                    levels={levels}
                />
            )}
        </div>
    );
};

export default SchoolClasses;