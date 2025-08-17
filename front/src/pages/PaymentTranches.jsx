import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    PencilSquare, 
    Trash,
    GripVertical,
    CheckCircle,
    XCircle,
    CreditCard,
    Grid,
    List,
    Search,
    ToggleOn,
    ToggleOff
} from 'react-bootstrap-icons';
import Swal from 'sweetalert2';

// Components - using Bootstrap only

// Hooks
import { secureApiEndpoints } from '../utils/apiMigration';

const PaymentTranches = () => {
    const [tranches, setTranches] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isAddModal, setIsAddModal] = useState(false);
    const [isEditModal, setIsEditModal] = useState(false);
    const [editingTranche, setEditingTranche] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    
    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        order: 0
    });

    useEffect(() => {
        loadTranches();
        loadDashboard();
    }, []);

    const loadTranches = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.paymentTranches.getAll();
            if (response.success) {
                setTranches(response.data);
            } else {
                setError(response.message || 'Erreur lors du chargement des tranches');
            }
        } catch (error) {
            setError('Erreur lors du chargement des tranches');
            console.error('Error loading payment tranches:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDashboard = async () => {
        try {
            // Créer des statistiques basées sur les tranches existantes
            const response = await secureApiEndpoints.paymentTranches.getAll();
            if (response.success) {
                const allTranches = response.data;
                const stats = {
                    total_tranches: allTranches.length,
                    active_tranches: allTranches.filter(t => t.is_active).length,
                    inactive_tranches: allTranches.filter(t => !t.is_active).length,
                    with_classes: 0 // Peut être calculé plus tard si nécessaire
                };
                setDashboardStats({ stats });
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            let response;
            
            if (editingTranche) {
                response = await secureApiEndpoints.paymentTranches.update(editingTranche.id, formData);
                setIsEditModal(false);
                setEditingTranche(null);
            } else {
                response = await secureApiEndpoints.paymentTranches.create(formData);
                setIsAddModal(false);
            }
            
            if (response.success) {
                resetForm();
                loadTranches();
                loadDashboard();
                setSuccess(response.message || `Tranche ${editingTranche ? 'modifiée' : 'créée'} avec succès`);
                
                Swal.fire({
                    title: 'Succès',
                    text: response.message || `Tranche ${editingTranche ? 'modifiée' : 'créée'} avec succès`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                setError(response.message || `Erreur lors de ${editingTranche ? 'la modification' : 'la création'} de la tranche`);
            }
        } catch (error) {
            console.error('Error submitting payment tranche:', error);
            setError(`Erreur lors de ${editingTranche ? 'la modification' : 'la création'} de la tranche`);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (tranche) => {
        setEditingTranche(tranche);
        setFormData({
            name: tranche.name,
            description: tranche.description || '',
            order: tranche.order
        });
        setIsEditModal(true);
    };

    const handleDelete = async (tranche) => {
        try {
            // Récupérer d'abord les statistiques d'utilisation de la tranche
            const usageResponse = await secureApiEndpoints.paymentTranches.getUsageStats(tranche.id);
            
            if (!usageResponse.success) {
                setError('Erreur lors de la vérification de l\'utilisation de la tranche');
                return;
            }

            const usageData = usageResponse.data;
            let confirmMessage = `Êtes-vous sûr de vouloir supprimer la tranche "${tranche.name}" ?`;
            let warningText = '';
            
            if (usageData.has_usage) {
                confirmMessage = `⚠️ Attention : Suppression en cascade`;
                
                let classNamesList = '';
                if (usageData.class_names && usageData.class_names.length > 0) {
                    classNamesList = usageData.class_names.join(', ');
                    if (usageData.classes_count > usageData.class_names.length) {
                        classNamesList += ` et ${usageData.classes_count - usageData.class_names.length} autre(s)`;
                    }
                }
                
                warningText = `
                    <div class="text-left">
                        <p><strong>Cette tranche est utilisée par ${usageData.classes_count} classe(s).</strong></p>
                        ${classNamesList ? `<p><strong>Classes concernées :</strong> ${classNamesList}</p>` : ''}
                        <p class="text-danger">
                            <strong>La supprimer entraînera la suppression automatique de tous les montants 
                            de paiement associés dans ces classes.</strong>
                        </p>
                        <p>Cette action est <strong>irréversible</strong>. Voulez-vous vraiment continuer ?</p>
                    </div>
                `;
            }

            const result = await Swal.fire({
                title: confirmMessage,
                html: warningText || `Êtes-vous sûr de vouloir supprimer la tranche "${tranche.name}" ?`,
                icon: usageData.has_usage ? 'warning' : 'question',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: usageData.has_usage ? 'Oui, supprimer tout' : 'Oui, supprimer',
                cancelButtonText: 'Annuler',
                width: '600px',
                customClass: {
                    htmlContainer: 'text-left'
                }
            });

            if (result.isConfirmed) {
                const response = await secureApiEndpoints.paymentTranches.delete(tranche.id);
                
                if (response.success) {
                    loadTranches();
                    loadDashboard();
                    setSuccess(response.message || 'La tranche a été supprimée avec succès');
                    
                    // Afficher un message différent selon qu'il y avait des suppressions en cascade
                    const successTitle = response.deleted_amounts_count > 0 
                        ? 'Suppression en cascade effectuée' 
                        : 'Supprimée';
                        
                    Swal.fire({
                        title: successTitle,
                        text: response.message || 'La tranche a été supprimée avec succès',
                        icon: 'success',
                        timer: 4000,
                        showConfirmButton: false
                    });
                } else {
                    setError(response.message || 'Erreur lors de la suppression de la tranche');
                }
            }
        } catch (error) {
            console.error('Error deleting payment tranche:', error);
            setError('Erreur lors de la suppression de la tranche');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            order: 0
        });
        setEditingTranche(null);
    };

    const handleCloseModal = () => {
        setIsAddModal(false);
        setIsEditModal(false);
        resetForm();
        setError('');
    };

    // Drag and Drop handlers
    const handleDragStart = (e, tranche) => {
        setDraggedItem(tranche);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetTranche) => {
        e.preventDefault();
        
        if (!draggedItem || draggedItem.id === targetTranche.id) {
            setDraggedItem(null);
            return;
        }

        const newTranches = [...tranches];
        const draggedIndex = newTranches.findIndex(t => t.id === draggedItem.id);
        const targetIndex = newTranches.findIndex(t => t.id === targetTranche.id);

        // Réorganiser les tranches
        newTranches.splice(draggedIndex, 1);
        newTranches.splice(targetIndex, 0, draggedItem);

        // Mettre à jour les ordres
        const reorderedTranches = newTranches.map((tranche, index) => ({
            ...tranche,
            order: index + 1
        }));

        setTranches(reorderedTranches);
        setDraggedItem(null);

        try {
            const reorderData = {
                tranches: reorderedTranches.map(t => ({
                    id: t.id,
                    order: t.order
                }))
            };
            
            const response = await secureApiEndpoints.paymentTranches.reorder(reorderData);
            
            if (response.success) {
                Swal.fire({
                    title: 'Succès',
                    text: response.message || 'Ordre des tranches mis à jour',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                setError(response.message || 'Erreur lors de la réorganisation des tranches');
                loadTranches(); // Recharger les données originales
            }
        } catch (error) {
            console.error('Error reordering payment tranches:', error);
            setError('Erreur lors de la réorganisation des tranches');
            loadTranches(); // Recharger les données originales
        }
    };

    // Filter tranches
    const filteredTranches = tranches.filter(tranche => {
        const matchesSearch = tranche.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (tranche.description && tranche.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesFilter = filterActive === 'all' || 
                            (filterActive === 'active' && tranche.is_active) ||
                            (filterActive === 'inactive' && !tranche.is_active);
        
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="h4 mb-1">Gestion des Tranches de Paiement</h2>
                            <p className="text-muted mb-0">
                                Configurez les tranches de paiement qui seront utilisées lors de la création des classes
                            </p>
                        </div>
                        <button
                            className="btn btn-primary d-flex align-items-center gap-2"
                            onClick={() => setIsAddModal(true)}
                        >
                            <Plus size={16} />
                            Nouvelle Tranche
                        </button>
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
            {success && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-success alert-dismissible fade show" role="alert">
                            {success}
                            <button 
                                type="button" 
                                className="btn-close" 
                                onClick={() => setSuccess('')}
                                aria-label="Close"
                            ></button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Stats */}
            {dashboardStats && (
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">Total Tranches</p>
                                        <h4 className="text-primary mb-0">
                                            {dashboardStats.stats.total_tranches}
                                        </h4>
                                    </div>
                                    <div className="bg-primary bg-opacity-10 p-3 rounded">
                                        <CreditCard className="text-primary" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">Tranches Actives</p>
                                        <h4 className="text-success mb-0">
                                            {dashboardStats.stats.active_tranches}
                                        </h4>
                                    </div>
                                    <div className="bg-success bg-opacity-10 p-3 rounded">
                                        <ToggleOn className="text-success" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">Tranches Inactives</p>
                                        <h4 className="text-danger mb-0">
                                            {dashboardStats.stats.inactive_tranches}
                                        </h4>
                                    </div>
                                    <div className="bg-danger bg-opacity-10 p-3 rounded">
                                        <ToggleOff className="text-danger" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">Ordre Moyen</p>
                                        <h4 className="text-info mb-0">
                                            {tranches.length > 0 ? Math.round(tranches.reduce((acc, t) => acc + t.order, 0) / tranches.length) : 0}
                                        </h4>
                                    </div>
                                    <div className="bg-info bg-opacity-10 p-3 rounded">
                                        <GripVertical className="text-info" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtres */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label">Rechercher</label>
                                    <div className="position-relative">
                                        <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                        <input
                                            type="text"
                                            className="form-control ps-5"
                                            placeholder="Rechercher une tranche..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Statut</label>
                                    <select
                                        className="form-select"
                                        value={filterActive}
                                        onChange={(e) => setFilterActive(e.target.value)}
                                    >
                                        <option value="all">Toutes les tranches</option>
                                        <option value="active">Tranches actives</option>
                                        <option value="inactive">Tranches inactives</option>
                                    </select>
                                </div>
                                <div className="col-md-4 d-flex align-items-end">
                                    <div className="btn-group me-3" role="group">
                                        <button
                                            type="button"
                                            className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setViewMode('grid')}
                                            title="Vue grille"
                                        >
                                            <Grid size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setViewMode('list')}
                                            title="Vue liste"
                                        >
                                            <List size={16} />
                                        </button>
                                    </div>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterActive('all');
                                        }}
                                    >
                                        Réinitialiser
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Liste des tranches */}
            <div className="row">
                <div className="col-12">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Chargement des tranches...</span>
                            </div>
                        </div>
                    ) : filteredTranches.length === 0 ? (
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <h5 className="text-muted">Aucune tranche trouvée</h5>
                                <p className="text-muted mb-4">
                                    {searchTerm || filterActive !== 'all' 
                                        ? 'Aucune tranche ne correspond à vos critères de recherche.'
                                        : 'Commencez par créer votre première tranche de paiement.'
                                    }
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setIsAddModal(true)}
                                >
                                    <Plus size={16} className="me-2" />
                                    Créer une tranche
                                </button>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="row">
                            {filteredTranches.map((tranche) => (
                                <div key={tranche.id} className="col-md-6 col-lg-4 mb-4">
                                    <div 
                                        className="card h-100 shadow-sm hover-card"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, tranche)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, tranche)}
                                        style={{ cursor: 'move' }}
                                    >
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                                                         style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>
                                                        {tranche.order}
                                                    </div>
                                                    <div>
                                                        <h6 className="card-title mb-1">{tranche.name}</h6>
                                                        <span className={`badge ${tranche.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                                            {tranche.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <GripVertical className="text-muted" size={16} />
                                            </div>
                                            
                                            {tranche.description && (
                                                <p className="card-text text-muted small mb-3">
                                                    {tranche.description}
                                                </p>
                                            )}
                                            
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => handleEdit(tranche)}
                                                    title="Modifier"
                                                >
                                                    <PencilSquare size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDelete(tranche)}
                                                    title="Supprimer"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="list-group">
                            {filteredTranches.map((tranche) => (
                                <div
                                    key={tranche.id}
                                    className="list-group-item list-group-item-action border mb-2 rounded"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, tranche)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, tranche)}
                                    style={{ cursor: 'move' }}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center">
                                            <GripVertical className="text-muted me-3" size={20} />
                                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                                                 style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>
                                                {tranche.order}
                                            </div>
                                            <div>
                                                <h6 className="mb-1">{tranche.name}</h6>
                                                {tranche.description && (
                                                    <p className="mb-1 text-muted small">{tranche.description}</p>
                                                )}
                                                <span className={`badge ${tranche.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                                    {tranche.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => handleEdit(tranche)}
                                                title="Modifier"
                                            >
                                                <PencilSquare size={14} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleDelete(tranche)}
                                                title="Supprimer"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {(isAddModal || isEditModal) && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingTranche ? 'Modifier la Tranche' : 'Ajouter une Tranche'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseModal}
                                ></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Nom de la tranche *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            placeholder="Ex: Inscription, 1er Trimestre..."
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Description</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            placeholder="Description de la tranche..."
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Ordre d'affichage</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={formData.order}
                                            onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleCloseModal}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Enregistrement...' : (editingTranche ? 'Modifier' : 'Créer')}
                                    </button>
                                </div>
                            </form>
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

export default PaymentTranches;