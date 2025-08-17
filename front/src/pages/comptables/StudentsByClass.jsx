import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    HouseHeartFill,
    PeopleFill,
    Search,
    Grid,
    List,
    InfoCircle
} from 'react-bootstrap-icons';
import { secureApiEndpoints } from '../../utils/apiMigration';

const AccountantClassSeries = () => {
    const { id: classId } = useParams();
    const navigate = useNavigate();
    
    const [classData, setClassData] = useState(null);
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        loadClassSeries();
    }, [classId]);

    const loadClassSeries = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.accountant.getClassSeries(classId);
            
            if (response.success) {
                setClassData(response.data.class);
                setSeries(response.data.series);
            } else {
                setError(response.message || 'Erreur lors du chargement des séries');
            }
        } catch (error) {
            console.error('Error loading class series:', error);
            setError('Erreur lors du chargement des séries');
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les séries selon la recherche
    const filteredSeries = series.filter(serie =>
        serie.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !classData) {
        return (
            <div className="container-fluid py-4">
                <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Chargement des séries...</span>
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
                        <div className="d-flex align-items-center">
                            <button
                                className="btn btn-outline-secondary me-3"
                                onClick={() => navigate('/class-comp')}
                            >
                                <ArrowLeft size={16} className="me-1" />
                                Retour
                            </button>
                            <div>
                                <h2 className="h4 mb-1">Séries - {classData?.name}</h2>
                                <p className="text-muted mb-0">
                                    {classData?.level?.section?.name} - {classData?.level?.name}
                                    {filteredSeries.length > 0 && ` • ${filteredSeries.length} série${filteredSeries.length > 1 ? 's' : ''}`}
                                </p>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-info">
                                <InfoCircle size={14} className="me-1" />
                                Mode Comptable
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
                                            placeholder="Rechercher par nom de série..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-4 d-flex align-items-end">
                                    <div className="btn-group w-100" role="group">
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

            {/* Series Grid */}
            {viewMode === 'grid' ? (
                <div className="row">
                    {filteredSeries.length === 0 ? (
                        <div className="col-12">
                            <div className="card">
                                <div className="card-body text-center py-5">
                                    <HouseHeartFill size={48} className="text-muted mb-3" />
                                    <h5 className="text-muted">Aucune série trouvée</h5>
                                    <p className="text-muted">
                                        {searchTerm 
                                            ? 'Aucune série ne correspond à vos critères de recherche.'
                                            : 'Cette classe n\'a pas encore de séries configurées.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        filteredSeries.map((serie) => (
                            <div key={serie.id} className="col-md-6 col-lg-4 mb-4">
                                <div className="card h-100 hover-card">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h6 className="card-title mb-1">{serie.name}</h6>
                                                <small className="text-muted">
                                                    Série de {classData?.name}
                                                </small>
                                            </div>
                                            <span className="badge bg-primary">
                                                {serie.students_count || 0} élève{(serie.students_count || 0) > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        
                                        <div className="d-flex justify-content-end mt-auto">
                                            <Link
                                                to={`/students/series/${serie.id}`}
                                                className="btn btn-primary btn-sm"
                                            >
                                                <PeopleFill size={14} className="me-1" />
                                                Voir les élèves
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                // List view
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Série</th>
                                                <th>Classe</th>
                                                <th>Élèves</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSeries.map((serie) => (
                                                <tr key={serie.id}>
                                                    <td className="fw-medium">{serie.name}</td>
                                                    <td>{classData?.name}</td>
                                                    <td>
                                                        <span className="badge bg-light text-dark">
                                                            {serie.students_count || 0} élève{(serie.students_count || 0) > 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <Link
                                                            to={`/students/series/${serie.id}`}
                                                            className="btn btn-sm btn-primary"
                                                        >
                                                            <PeopleFill size={14} className="me-1" />
                                                            Voir les élèves
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

export default AccountantClassSeries;