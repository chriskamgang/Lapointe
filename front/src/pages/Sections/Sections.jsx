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

const Sections = () => {
    const { user } = useAuth();
    const [sections, setSections] = useState([]);
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
    const [selectedSection, setSelectedSection] = useState(null);
    
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
        order: 0
    });

    // Load data on component mount
    useEffect(() => {
        loadSections();
        loadDashboard();
    }, []);

    const loadSections = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.sections.getAll();
            if (response.success) {
                setSections(response.data);
            } else {
                setError(response.message || 'Erreur lors du chargement des sections');
            }
        } catch (error) {
            setError('Erreur lors du chargement des sections');
            console.error('Error loading sections:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDashboard = async () => {
        try {
            const response = await secureApiEndpoints.sections.getDashboard();
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

            const response = selectedSection 
                ? await secureApiEndpoints.sections.update(selectedSection.id, formData)
                : await secureApiEndpoints.sections.create(formData);

            if (response.success) {
                setSuccess(response.message);
                resetForm();
                setShowAddModal(false);
                setShowEditModal(false);
                loadSections();
                loadDashboard();
            } else {
                setError(response.message || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            setError('Erreur lors de la sauvegarde');
            console.error('Error saving section:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedSection) return;

        try {
            setError('');
            const response = await secureApiEndpoints.sections.delete(selectedSection.id);
            
            if (response.success) {
                setSuccess(response.message);
                setShowDeleteModal(false);
                setSelectedSection(null);
                loadSections();
                loadDashboard();
            } else {
                setError(response.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            setError('Erreur lors de la suppression');
            console.error('Error deleting section:', error);
        }
    };

    const handleToggleStatus = async (section) => {
        try {
            const response = await secureApiEndpoints.sections.toggleStatus(section.id);
            if (response.success) {
                setSuccess(response.message);
                loadSections();
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
        setSelectedSection(null);
    };

    const openEditModal = (section) => {
        setSelectedSection(section);
        setFormData({
            name: section.name,
            description: section.description || '',
            is_active: section.is_active,
            order: section.order
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (section) => {
        setSelectedSection(section);
        setShowDeleteModal(true);
    };

    // Filter sections
    const filteredSections = sections.filter(section => {
        const matchesSearch = section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (section.description && section.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesFilter = filterActive === 'all' || 
                            (filterActive === 'active' && section.is_active) ||
                            (filterActive === 'inactive' && !section.is_active);
        
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner text="Chargement des sections..." size="lg" />
            </div>
        );
    }

    return (
        <div className="sections-page">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Gestion des Sections
                    </h1>
                    <p className="text-gray-600">
                        Bienvenue {user?.name} - Gérez les sections de l'établissement
                    </p>
                </div>
                <div className="flex gap-2">
                    <ImportExportButton
                        title="Sections"
                        apiBasePath="/api/sections"
                        onImportSuccess={loadSections}
                        templateFileName="template_sections.csv"
                    />
                    
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Nouvelle Section
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
                                <p className="text-sm text-gray-600">Total Sections</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {dashboardStats.stats.total_sections}
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
                                <p className="text-sm text-gray-600">Sections Actives</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {dashboardStats.stats.active_sections}
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
                                <p className="text-sm text-gray-600">Sections Inactives</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {dashboardStats.stats.inactive_sections}
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
                                <p className="text-sm text-gray-600">Avec Classes</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {dashboardStats.stats.sections_with_classes}
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
                                            placeholder="Rechercher une section..."
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
                                        <option value="all">Toutes les sections</option>
                                        <option value="active">Sections actives</option>
                                        <option value="inactive">Sections inactives</option>
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

            {/* Sections List/Grid */}
            {filteredSections.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-gray-500 mb-4">Aucune section trouvée</p>
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 mx-auto"
                    >
                        <Plus size={16} />
                        Créer la première section
                    </Button>
                </Card>
            ) : viewMode === 'grid' ? (
                // Vue en grille
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSections.map((section) => (
                        <Card key={section.id} className="p-4 hover:shadow-md transition-shadow duration-200">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {section.name}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        section.is_active 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {section.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            
                            {section.description && (
                                <p className="text-gray-600 text-sm mb-4">
                                    {section.description}
                                </p>
                            )}
                            
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    Ordre: {section.order}
                                </span>
                                
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(section)}
                                        title={section.is_active ? 'Désactiver' : 'Activer'}
                                    >
                                        {section.is_active ? <ToggleOn size={16} /> : <ToggleOff size={16} />}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(section)}
                                        title="Modifier"
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteModal(section)}
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
                    {filteredSections.map((section) => (
                        <Card key={section.id} className="p-4 hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {section.name}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                section.is_active 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {section.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                Ordre: {section.order}
                                            </span>
                                        </div>
                                        {section.description && (
                                            <p className="text-gray-600 text-sm">
                                                {section.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-1 ml-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(section)}
                                        title={section.is_active ? 'Désactiver' : 'Activer'}
                                    >
                                        {section.is_active ? <ToggleOn size={16} /> : <ToggleOff size={16} />}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(section)}
                                        title="Modifier"
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteModal(section)}
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
                title={selectedSection ? 'Modifier la Section' : 'Nouvelle Section'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nom de la section"
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
                            placeholder="Description de la section..."
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
                            Section active
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
                            {selectedSection ? 'Modifier' : 'Créer'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedSection(null);
                }}
                title="Confirmer la suppression"
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Êtes-vous sûr de vouloir supprimer la section <strong>{selectedSection?.name}</strong> ?
                    </p>
                    <p className="text-sm text-red-600">
                        Cette action est irréversible et ne sera possible que si la section ne contient aucune classe.
                    </p>
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedSection(null);
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

export default Sections;