import React, { useState, useEffect } from 'react';
import { equipmentManagementApi, equipmentUtils } from '../../services/equipmentManagementApi';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { Plus, Pencil, Trash, Eye, Search, Funnel } from 'react-bootstrap-icons';

const EquipmentManagement = () => {
    const [equipments, setEquipments] = useState([]);
    const [stats, setStats] = useState(null);
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState(null);
    
    // États du formulaire
    const [formData, setFormData] = useState({
        school_id: '',
        equipment_type: '',
        item_name: '',
        price: '',
        category: '',
        description: '',
        is_mandatory: false,
        applicable_levels: [],
        applicable_specialties: [],
        is_active: true,
        order: ''
    });
    
    // États des filtres
    const [filters, setFilters] = useState({
        school_id: '',
        equipment_type: '',
        is_mandatory: '',
        is_active: '1',
        search: ''
    });

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const [equipmentResponse, statsResponse, schoolsResponse] = await Promise.all([
                equipmentManagementApi.getEquipmentList(filters),
                equipmentManagementApi.getStats(),
                equipmentManagementApi.getSchools()
            ]);

            if (equipmentResponse.success) {
                setEquipments(equipmentResponse.data.data || []);
                setPagination({
                    current_page: equipmentResponse.data.current_page,
                    last_page: equipmentResponse.data.last_page,
                    total: equipmentResponse.data.total
                });
            }

            if (statsResponse.success) {
                setStats(statsResponse.data);
            }

            // Handle different response structures - sometimes API returns direct data, sometimes wrapped
            if (schoolsResponse.success) {
                setSchools(schoolsResponse.data || []);
            } else if (Array.isArray(schoolsResponse)) {
                setSchools(schoolsResponse);
            } else if (schoolsResponse && schoolsResponse.data) {
                setSchools(schoolsResponse.data);
            } else {
                console.warn('Schools API call failed or unknown structure:', schoolsResponse);
                setSchools([]);
            }

        } catch (err) {
            console.error('Erreur lors du chargement:', err);
            setError('Impossible de charger les données. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validation = equipmentUtils.validateEquipment(formData);
        if (!validation.isValid) {
            setError('Veuillez corriger les erreurs dans le formulaire');
            return;
        }

        try {
            setLoading(true);
            
            if (selectedEquipment) {
                await equipmentManagementApi.updateEquipment(selectedEquipment.id, formData);
            } else {
                await equipmentManagementApi.createEquipment(formData);
            }

            setShowForm(false);
            resetForm();
            await loadData();
            
        } catch (err) {
            console.error('Erreur lors de la sauvegarde:', err);
            setError('Erreur lors de la sauvegarde. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (equipment) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet équipement ?')) return;

        try {
            await equipmentManagementApi.deleteEquipment(equipment.id);
            await loadData();
        } catch (err) {
            console.error('Erreur lors de la suppression:', err);
            setError('Erreur lors de la suppression. Veuillez réessayer.');
        }
    };

    const handleToggleStatus = async (equipment) => {
        try {
            await equipmentManagementApi.toggleEquipmentStatus(equipment.id);
            await loadData();
        } catch (err) {
            console.error('Erreur lors du changement de statut:', err);
            setError('Erreur lors du changement de statut. Veuillez réessayer.');
        }
    };

    const resetForm = () => {
        setFormData({
            school_id: '',
            equipment_type: '',
            item_name: '',
            price: '',
            category: '',
            description: '',
            is_mandatory: false,
            applicable_levels: [],
            applicable_specialties: [],
            is_active: true,
            order: ''
        });
        setSelectedEquipment(null);
    };

    const openEditForm = (equipment) => {
        setFormData({
            school_id: equipment.school_id,
            equipment_type: equipment.equipment_type,
            item_name: equipment.item_name,
            price: equipment.price || '',
            category: equipment.category || '',
            description: equipment.description || '',
            is_mandatory: equipment.is_mandatory,
            applicable_levels: equipment.applicable_levels || [],
            applicable_specialties: equipment.applicable_specialties || [],
            is_active: equipment.is_active,
            order: equipment.order || ''
        });
        setSelectedEquipment(equipment);
        setShowForm(true);
    };

    const getSchoolName = (schoolId) => {
        const school = schools.find(s => s.id === schoolId);
        return school ? school.name : 'École inconnue';
    };

    if (loading && !equipments.length) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des Équipements</h1>
                    <p className="text-gray-600 mt-1">
                        Gérez les équipements requis pour chaque école de l'IUP
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                    <Plus size={16} />
                    Nouvel Équipement
                </Button>
            </div>

            {/* Statistiques */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                        <div className="text-sm text-gray-600">Total équipements</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                        <div className="text-sm text-gray-600">Actifs</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-2xl font-bold text-orange-600">{stats.mandatory}</div>
                        <div className="text-sm text-gray-600">Obligatoires</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-2xl font-bold text-purple-600">{stats.by_school?.length || 0}</div>
                        <div className="text-sm text-gray-600">Écoles</div>
                    </Card>
                </div>
            )}

            {/* Filtres */}
            <Card className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Filtres</h3>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2"
                    >
                        <Funnel size={14} />
                        {showFilters ? 'Masquer' : 'Afficher'}
                    </Button>
                </div>
                
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">École</label>
                            <select
                                value={filters.school_id}
                                onChange={(e) => setFilters({...filters, school_id: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Toutes les écoles</option>
                                {schools.map(school => (
                                    <option key={school.id} value={school.id}>
                                        {school.code} - {school.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={filters.equipment_type}
                                onChange={(e) => setFilters({...filters, equipment_type: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tous les types</option>
                                {equipmentUtils.getEquipmentTypes().map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.icon} {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                            <select
                                value={filters.is_active}
                                onChange={(e) => setFilters({...filters, is_active: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tous</option>
                                <option value="1">Actifs seulement</option>
                                <option value="0">Inactifs seulement</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Obligatoire</label>
                            <select
                                value={filters.is_mandatory}
                                onChange={(e) => setFilters({...filters, is_mandatory: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tous</option>
                                <option value="1">Obligatoires seulement</option>
                                <option value="0">Optionnels seulement</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Nom d'équipement..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Messages d'erreur */}
            {error && (
                <Alert variant="danger">
                    {error}
                </Alert>
            )}

            {/* Liste des équipements */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Équipement
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    École
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Prix
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {equipments.map((equipment) => (
                                <tr key={equipment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="text-2xl mr-3">
                                                {equipmentUtils.getTypeIcon(equipment.equipment_type)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {equipment.item_name}
                                                </div>
                                                {equipment.description && (
                                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                                        {equipment.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {equipment.school?.name || getSchoolName(equipment.school_id)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge className={equipmentUtils.getTypeColor(equipment.equipment_type)} size="sm">
                                            {equipmentUtils.getTypeLabel(equipment.equipment_type)}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {equipmentUtils.formatPrice(equipment.price)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Badge 
                                                variant={equipment.is_active ? "success" : "secondary"} 
                                                size="sm"
                                            >
                                                {equipment.is_active ? 'Actif' : 'Inactif'}
                                            </Badge>
                                            {equipment.is_mandatory && (
                                                <Badge variant="danger" size="sm">
                                                    Obligatoire
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditForm(equipment)}
                                                className="flex items-center gap-1"
                                            >
                                                <Pencil size={14} />
                                                Modifier
                                            </Button>
                                            <Button
                                                variant={equipment.is_active ? "secondary" : "success"}
                                                size="sm"
                                                onClick={() => handleToggleStatus(equipment)}
                                            >
                                                {equipment.is_active ? 'Désactiver' : 'Activer'}
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDelete(equipment)}
                                                className="flex items-center gap-1"
                                            >
                                                <Trash size={14} />
                                                Supprimer
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {equipments.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-4xl text-gray-300 mb-4">📦</div>
                            <p className="text-gray-500">Aucun équipement trouvé</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
                <div className="flex justify-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                            Page {pagination.current_page} sur {pagination.last_page} ({pagination.total} équipements)
                        </span>
                    </div>
                </div>
            )}

            {/* Formulaire modal (simplifié pour l'exemple) */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-4">
                            {selectedEquipment ? 'Modifier l\'équipement' : 'Nouvel équipement'}
                        </h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">École *</label>
                                    <select
                                        value={formData.school_id}
                                        onChange={(e) => setFormData({...formData, school_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Sélectionnez une école</option>
                                        {schools.map(school => (
                                            <option key={school.id} value={school.id}>
                                                {school.code} - {school.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                    <select
                                        value={formData.equipment_type}
                                        onChange={(e) => setFormData({...formData, equipment_type: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Sélectionnez un type</option>
                                        {equipmentUtils.getEquipmentTypes().map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.icon} {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'équipement *</label>
                                <input
                                    type="text"
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="3"
                                ></textarea>
                            </div>
                            
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_mandatory}
                                        onChange={(e) => setFormData({...formData, is_mandatory: e.target.checked})}
                                        className="mr-2"
                                    />
                                    Équipement obligatoire
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                        className="mr-2"
                                    />
                                    Actif
                                </label>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                >
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentManagement;