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
    Filter,
    Building,
    Book
} from 'react-bootstrap-icons';

// Components
import { Card, Input, Alert, LoadingSpinner, Modal } from '../../components/UI';
import ImportExportButton from '../../components/ImportExportButton';
import { secureApiEndpoints } from '../../utils/apiMigration';

// Hooks
import { useAuth } from '../../hooks/useAuth';
import { Button } from 'react-bootstrap';

const Levels = () => {
    const { user } = useAuth();
    const [levels, setLevels] = useState([]);
    const [sections, setSections] = useState([]);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState('all');
    const [filterSection, setFilterSection] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState(null);
    
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        section_id: '',
        description: '',
        is_active: true,
        order: 0
    });

    // Load data on component mount
    useEffect(() => {
        loadLevels();
        loadSections();
        loadDashboard();
    }, []);

    const loadLevels = async () => {
        try {
            setLoading(true);
            const response = await secureApiEndpoints.levels.getAll();
            if (response.success) {
                setLevels(response.data);
            } else {
                setError(response.message || 'Erreur lors du chargement des niveaux');
            }
        } catch (error) {
            setError('Erreur lors du chargement des niveaux');
            console.error('Error loading levels:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSections = async () => {
        try {
            const response = await secureApiEndpoints.sections.getAll();
            if (response.success) {
                setSections(response.data);
            }
        } catch (error) {
            console.error('Error loading sections:', error);
        }
    };

    const loadDashboard = async () => {
        try {
            const response = await secureApiEndpoints.levels.getDashboard();
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

            const response = selectedLevel 
                ? await secureApiEndpoints.levels.update(selectedLevel.id, formData)
                : await secureApiEndpoints.levels.create(formData);

            if (response.success) {
                setSuccess(response.message);
                resetForm();
                setShowAddModal(false);
                setShowEditModal(false);
                loadLevels();
                loadDashboard();
            } else {
                setError(response.message || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            setError('Erreur lors de la sauvegarde');
            console.error('Error saving level:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedLevel) return;

        try {
            setError('');
            const response = await secureApiEndpoints.levels.delete(selectedLevel.id);
            
            if (response.success) {
                setSuccess(response.message);
                setShowDeleteModal(false);
                setSelectedLevel(null);
                loadLevels();
                loadDashboard();
            } else {
                setError(response.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            setError('Erreur lors de la suppression');
            console.error('Error deleting level:', error);
        }
    };

    const handleToggleStatus = async (level) => {
        try {
            const response = await secureApiEndpoints.levels.toggleStatus(level.id);
            if (response.success) {
                setSuccess(response.message);
                loadLevels();
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
            section_id: '',
            description: '',
            is_active: true,
            order: 0
        });
        setSelectedLevel(null);
    };

    const openEditModal = (level) => {
        setSelectedLevel(level);
        setFormData({
            name: level.name,
            section_id: level.section_id.toString(),
            description: level.description || '',
            is_active: level.is_active,
            order: level.order
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (level) => {
        setSelectedLevel(level);
        setShowDeleteModal(true);
    };

    // Filter levels
    const filteredLevels = levels.filter(level => {
        const matchesSearch = level.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (level.description && level.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (level.section && level.section.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesFilter = filterActive === 'all' || 
                            (filterActive === 'active' && level.is_active) ||
                            (filterActive === 'inactive' && !level.is_active);

        const matchesSection = filterSection === 'all' || 
                              level.section_id.toString() === filterSection;
        
        return matchesSearch && matchesFilter && matchesSection;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner text="Chargement des niveaux..." size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Gestion des Niveaux
                    </h1>
                    <p className="text-gray-600">
                        Bienvenue {user?.name} - Gérez les niveaux de classe de l'établissement
                    </p>
                </div>
                <div className="flex gap-2">
                    <ImportExportButton
                        title="Niveaux"
                        apiBasePath="/api/levels"
                        onImportSuccess={loadLevels}
                        filters={{ section_id: filterSection !== 'all' ? filterSection : undefined }}
                        templateFileName="template_niveaux.csv"
                    />
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                    >
                        <Plus size={16} />
                        Nouveau Niveau
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Niveaux</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {dashboardStats.stats.total_levels}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Book className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Niveaux Actifs</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {dashboardStats.stats.active_levels}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <ToggleOn className="text-green-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Niveaux Inactifs</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {dashboardStats.stats.inactive_levels}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <ToggleOff className="text-red-600" size={24} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Avec Classes</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {dashboardStats.stats.levels_with_classes}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Building className="text-purple-600" size={24} />
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
                                <div className="col-md-3">
                                    <label className="form-label">Rechercher</label>
                                    <div className="position-relative">
                                        <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                                        <input
                                            type="text"
                                            className="form-control ps-5"
                                            placeholder="Rechercher un niveau..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Section</label>
                                    <select
                                        className="form-select"
                                        value={filterSection}
                                        onChange={(e) => setFilterSection(e.target.value)}
                                    >
                                        <option value="all">Toutes les sections</option>
                                        {sections.map(section => (
                                            <option key={section.id} value={section.id.toString()}>
                                                {section.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Statut</label>
                                    <select
                                        className="form-select"
                                        value={filterActive}
                                        onChange={(e) => setFilterActive(e.target.value)}
                                    >
                                        <option value="all">Tous les niveaux</option>
                                        <option value="active">Niveaux actifs</option>
                                        <option value="inactive">Niveaux inactifs</option>
                                    </select>
                                </div>
                                <div className="col-md-3 d-flex align-items-end">
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
                                            setFilterSection('all');
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

            {/* Levels List/Grid */}
            {filteredLevels.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-gray-500 mb-4">Aucun niveau trouvé</p>
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 mx-auto"
                    >
                        <Plus size={16} />
                        Créer le premier niveau
                    </Button>
                </Card>
            ) : viewMode === 'grid' ? (
                // Vue en grille
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredLevels.map((level) => (
                        <Card key={level.id} className="p-4 hover:shadow-md transition-shadow duration-200">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {level.name}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        level.is_active 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {level.is_active ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <p className="text-sm text-gray-600 mb-1">
                                    Section: <span className="font-medium text-blue-600">
                                        {level.section?.name}
                                    </span>
                                </p>
                                {level.description && (
                                    <p className="text-gray-600 text-sm">
                                        {level.description}
                                    </p>
                                )}
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    Ordre: {level.order}
                                </span>
                                
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(level)}
                                        title={level.is_active ? 'Désactiver' : 'Activer'}
                                    >
                                        {level.is_active ? <ToggleOn size={16} /> : <ToggleOff size={16} />}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(level)}
                                        title="Modifier"
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteModal(level)}
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
                <div className="space-y-4">
                    {filteredLevels.map((level) => (
                        <Card key={level.id} className="p-4 hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {level.name}
                                            </h3>
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                level.is_active 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {level.is_active ? 'Actif' : 'Inactif'}
                                            </span>
                                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                {level.section?.name}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                Ordre: {level.order}
                                            </span>
                                        </div>
                                        {level.description && (
                                            <p className="text-gray-600 text-sm">
                                                {level.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-1 ml-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleStatus(level)}
                                        title={level.is_active ? 'Désactiver' : 'Activer'}
                                    >
                                        {level.is_active ? <ToggleOn size={16} /> : <ToggleOff size={16} />}
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditModal(level)}
                                        title="Modifier"
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openDeleteModal(level)}
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
                title={selectedLevel ? 'Modifier le Niveau' : 'Nouveau Niveau'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nom du niveau"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ex: CP, CE1, 6ème..."
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Section *
                        </label>
                        <select
                            value={formData.section_id}
                            onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Sélectionner une section</option>
                            {sections.filter(s => s.is_active).map(section => (
                                <option key={section.id} value={section.id.toString()}>
                                    {section.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Description du niveau..."
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
                            Niveau actif
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
                            {selectedLevel ? 'Modifier' : 'Créer'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedLevel(null);
                }}
                title="Confirmer la suppression"
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Êtes-vous sûr de vouloir supprimer le niveau <strong>{selectedLevel?.name}</strong> ?
                    </p>
                    <p className="text-sm text-red-600">
                        Cette action est irréversible et ne sera possible que si le niveau ne contient aucune classe.
                    </p>
                    
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedLevel(null);
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

export default Levels;