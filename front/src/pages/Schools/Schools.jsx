import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Eye, 
    Pencil, 
    Trash,
    ToggleOff,
    ToggleOn,
    Grid,
    List,
    Filter
} from 'react-bootstrap-icons';

// Components
import { Card, Input, Alert, LoadingSpinner, Modal } from '../../components/UI';
import ImportExportButton from '../../components/ImportExportButton';
import { secureApiEndpoints } from '../../utils/apiMigration';

// Hooks
import { useAuth } from '../../hooks/useAuth';
import { Button } from 'react-bootstrap';

const Schools = () => {
    const { user } = useAuth();
    const [schools, setSchools] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
        order: 0
    });

    // Load data on component mount
    useEffect(() => {
        loadSchools();
        loadDashboard();
    }, []);

    const loadSchools = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.schools.getAll();
            if (response.success) {
                setSchools(response.data);
            } else {
                setError(response.message || 'Erreur lors du chargement des écoles');
            }
        } catch (error) {
            setError('Erreur lors du chargement des écoles');
            console.error('Error loading school:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDashboard = async () => {
        try {
            const response = await secureApiEndpoints.schools.getDashboard();
            if (response.success) {
                setDashboardStats(response.data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setSuccess('');

            const response = selectedSchool 
                ? await secureApiEndpoints.schools.update(selectedSchool.id, formData)
                : await secureApiEndpoints.schools.create(formData);

            if (response.success) {
                setSuccess(response.message);
                resetForm();
                setShowAddModal(false);
                setShowEditModal(false);
                loadSchools();
                loadDashboard();
            } else {
                setError(response.message || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            setError('Erreur lors de la sauvegarde');
            console.error('Error saving school:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedSchool) return;

        try {
            setError('');
            const response = await secureApiEndpoints.schools.delete(selectedSchool.id);
            
            if (response.success) {
                setSuccess(response.message);
                setShowDeleteModal(false);
                setSelectedSchool(null);
                loadSchools();
                loadDashboard();
            } else {
                setError(response.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            setError('Erreur lors de la suppression');
            console.error('Error deleting school:', error);
        }
    };

    const handleToggleStatus = async (school) => {
        try {
            const response = await secureApiEndpoints.schools.toggleStatus(school.id);
            if (response.success) {
                setSuccess(response.message);
                loadSchools();
                loadDashboard();
            } else {
                setError(response.message || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            setError('Erreur lors de la mise à jour du statut');
            console.error('Error toggling status:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            is_active: true,
            order: 0
        });
        setSelectedSchool(null);
    };

    const openEditModal = (school) => {
        setSelectedSchool(school);
        setFormData({
            name: school.name,
            description: school.description || '',
            is_active: school.is_active,
            order: school.order
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (school) => {
        setSelectedSchool(school);
        setShowDeleteModal(true);
    };

    // Filter schools
    const filteredSchools = schools.filter(school => {
        const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (school.description && school.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesFilter = filterActive === 'all' || 
                            (filterActive === 'active' && school.is_active) ||
                            (filterActive === 'inactive' && !school.is_active);
        
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner text="Chargement des écoles..." size="lg" />
            </div>
        );
    }

    return (
        <div className="schools-page">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Gestion des Ecoles
                    </h1>
                    <p className="text-gray-600">
                        Bienvenue {user?.name} - Gérez les écoles de l'institut
                    </p>
                </div>
                <div className="flex gap-2">
                    <ImportExportButton
                        title="Ecoles"
                        apiBasePath="/api/schools"
                        onImportSuccess={loadSchools}
                        templateFileName="template_schools.csv"
                    />
                    
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Nouvelle Ecole
                    </Button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError('')}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" className="mb-4" dismissible onDismiss={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            {/* Dashboard Stats */}
            {dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Ecoles</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {dashboardStats.stats.total_schools}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Grid className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Ecoles Actives</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {dashboardStats.stats.active_schools}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <ToggleOn className="text-green-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Ecoles Inactives</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {dashboardStats.stats.inactive_schools}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <ToggleOff className="text-red-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Avec Spécialités</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {dashboardStats.stats.schools_with_classes}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <List className="text-purple-600" size={24} />
                            </div>
                        </div>
                    </Card>
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
                                            placeholder="Rechercher une école..."
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
                                        <option value="all">Toutes les écoles</option>
                                        <option value="active">Ecoles actives</option>
                                        <option value="inactive">Ecoles inactives</option>
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

            {/* Schools List/Grid */}
            {filteredSchools.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-gray-500 mb-4">Aucune écoles trouvée</p>
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 mx-auto"
                    >
                        <Plus size={16} />
                        Créer la première school
                    </Button>
                </Card>
            ) : viewMode === 'grid' ? (
                // Vue en grille
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSchools.map((school) => (
                        <Card key={school.id} className="p-4 hover:shadow-md transition-shadow duration-200">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {school.name}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        school.is_active 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {school.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            
                            {school.description && (
                                <p className="text-gray-600 text-sm mb-4">
                                    {school.description}
                                </p>
                            )}
                            
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    Ordre: {school.order}
                                </span>
                                
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(school)}
                                        title={school.is_active ? 'Désactiver' : 'Activer'}
                                    >
                                        {school.is_active ? <ToggleOn size={16} /> : <ToggleOff size={16} />}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(school)}
                                        title="Modifier"
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteModal(school)}
                                        className="text-red-600 hover:text-red-700"
                                        title="Supprimer"
                                    >
                                        <Trash size={16} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                // Vue en liste
                <div className="space-y-3">
                    {filteredSchools.map((school) => (
                        <Card key={school.id} className="p-4 hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {school.name}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                school.is_active 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {school.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                Ordre: {school.order}
                                            </span>
                                        </div>
                                        {school.description && (
                                            <p className="text-gray-600 text-sm">
                                                {school.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-1 ml-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(school)}
                                        title={school.is_active ? 'Désactiver' : 'Activer'}
                                    >
                                        {school.is_active ? <ToggleOn size={16} /> : <ToggleOff size={16} />}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(school)}
                                        title="Modifier"
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteModal(school)}
                                        className="text-red-600 hover:text-red-700"
                                        title="Supprimer"
                                    >
                                        <Trash size={16} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showAddModal || showEditModal}
                onClose={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                }}
                title={selectedSchool ? 'Modifier la School' : 'Nouvelle School'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nom de la school"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ex: Primaire, Secondaire..."
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Description de la school..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <Input
                        label="Ordre d'affichage"
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                        min="0"
                        placeholder="0"
                    />

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                            School active
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowAddModal(false);
                                setShowEditModal(false);
                                resetForm();
                            }}
                        >
                            Annuler
                        </Button>
                        <Button type="submit">
                            {selectedSchool ? 'Modifier' : 'Créer'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedSchool(null);
                }}
                title="Confirmer la suppression"
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Êtes-vous sûr de vouloir supprimer la school <strong>{selectedSchool?.name}</strong> ?
                    </p>
                    <p className="text-sm text-red-600">
                        Cette action est irréversible et ne sera possible que si la school ne contient aucune classe.
                    </p>
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedSchool(null);
                            }}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDelete}
                        >
                            Supprimer
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Schools;