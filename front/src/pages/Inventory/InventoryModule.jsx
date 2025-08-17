import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit as Pencil, 
  Trash2 as Trash, 
  Archive,
  AlertTriangle as ExclamationTriangle,
  CheckCircle,
  Filter,
  Download,
  Grid,
  List
} from 'lucide-react';

// Components
import { Card, Button, Alert, LoadingSpinner, Modal } from '../../components/UI';
import { useAuth } from '../../hooks/useAuth';
import { secureApiEndpoints } from '../../utils/apiMigration';

const InventoryModule = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [etats, setEtats] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEtat, setFilterEtat] = useState('');
  const [viewMode, setViewMode] = useState('list');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    quantite: '',
    quantiteMin: '',
    etat: 'Bon',
    localisation: '',
    dateAchat: '',
    prix: '',
    numeroSerie: '',
    responsable: ''
  });

  // Chargement initial des données
  useEffect(() => {
    loadInventoryData();
    loadConfig();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [itemsResponse, dashboardResponse] = await Promise.all([
        secureApiEndpoints.inventory.getAll({ search: searchTerm, category: filterCategory, etat: filterEtat }),
        secureApiEndpoints.inventory.getDashboard()
      ]);
      
      if (itemsResponse.success) {
        setInventory(itemsResponse.data.data || []);
      }
      
      if (dashboardResponse.success) {
        setDashboardStats(dashboardResponse.data.stats);
        setLowStockAlerts(dashboardResponse.data.low_stock_alerts || []);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await secureApiEndpoints.inventory.getConfig();
      if (response.success) {
        setCategories(response.data.categories || []);
        setEtats(response.data.etats || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  // Recharger les données quand les filtres changent
  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventoryData();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, filterCategory, filterEtat]);

  // Le filtrage est déjà fait côté serveur, pas besoin de refiltrer côté client
  const filteredInventory = inventory;

  // Utiliser les alertes de stock du backend au lieu du calcul local
  // const alertesStock = inventory.filter(item => item.quantite <= item.quantite_min);

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: '',
      quantite: '',
      quantiteMin: '',
      description: '',
      etat: 'Bon',
      localisation: '',
      dateAchat: '',
      prix: '',
      numeroSerie: '',
      responsable: ''
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      const articleData = {
        nom: formData.nom,
        categorie: formData.categorie,
        quantite: parseInt(formData.quantite) || 0,
        quantite_min: parseInt(formData.quantiteMin) || 0,
        etat: formData.etat,
        localisation: formData.localisation,
        responsable: formData.responsable,
        date_achat: formData.dateAchat || null,
        prix: parseFloat(formData.prix) || 0,
        numero_serie: formData.numeroSerie || null,
        description: formData.description || null
      };

      if (selectedItem) {
        // Modification
        const response = await secureApiEndpoints.inventory.update(selectedItem.id, articleData);
        if (response.success) {
          setSuccess('Article modifié avec succès !');
          setShowEditModal(false);
          await loadInventoryData();
        } else {
          throw new Error(response.message || 'Erreur lors de la modification');
        }
      } else {
        // Création
        const response = await secureApiEndpoints.inventory.create(articleData);
        if (response.success) {
          setSuccess('Article ajouté avec succès !');
          setShowAddModal(false);
          await loadInventoryData();
        } else {
          throw new Error(response.message || 'Erreur lors de la création');
        }
      }
      
      resetForm();
      setSelectedItem(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      if (error.type === 'validation' && error.errors) {
        const errorMessages = Object.values(error.errors).flat().join('\n');
        setError(`Erreur de validation:\n${errorMessages}`);
      } else {
        setError(error.message || 'Erreur lors de la sauvegarde de l\'article');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      nom: item.nom || '',
      categorie: item.categorie || '',
      quantite: item.quantite?.toString() || '',
      quantiteMin: item.quantite_min?.toString() || '',
      etat: item.etat || 'Bon',
      localisation: item.localisation || '',
      dateAchat: item.date_achat || '',
      prix: item.prix?.toString() || '',
      numeroSerie: item.numero_serie || '',
      responsable: item.responsable || '',
      description: item.description || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await secureApiEndpoints.inventory.delete(selectedItem.id);
      if (response.success) {
        setSuccess('Article supprimé avec succès !');
        setShowDeleteModal(false);
        setSelectedItem(null);
        await loadInventoryData();
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setError(error.message || 'Erreur lors de la suppression de l\'article');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await secureApiEndpoints.inventory.exportData({
        search: searchTerm,
        category: filterCategory,
        etat: filterEtat
      });
      
      if (response.success) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `inventaire_lycee_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        setSuccess(`Export réalisé avec succès (${response.count} articles)`);
      } else {
        throw new Error(response.message || 'Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      setError(error.message || 'Erreur lors de l\'export des données');
    } finally {
      setLoading(false);
    }
  };

  const getEtatColor = (etat) => {
    switch(etat) {
      case 'Excellent': return 'bg-success text-white';
      case 'Bon': return 'bg-primary text-white';
      case 'Moyen': return 'bg-warning text-dark';
      case 'Mauvais': return 'bg-danger text-white';
      case 'Hors service': return 'bg-dark text-white';
      default: return 'bg-secondary text-white';
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 text-primary d-flex align-items-center mb-1">
                <Archive className="me-2" size={32} />
                Gestion d'Inventaire
              </h1>
              <p className="text-muted mb-0">
                Bienvenue {user?.name} - Gérez l'inventaire des équipements et matériels
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="success"
                onClick={exportData}
                className="d-flex align-items-center gap-2"
              >
                <Download size={16} />
                Exporter JSON
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="d-flex align-items-center gap-2"
              >
                <Plus size={16} />
                Nouvel Article
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
          <div className="row mb-4">
            <div className="col-md-3">
              <Card className="p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Total Articles</p>
                    <p className="h4 text-primary mb-0">{dashboardStats?.total_articles || 0}</p>
                  </div>
                  <div className="bg-primary bg-opacity-10 rounded p-3">
                    <Archive className="text-primary" size={24} />
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="col-md-3">
              <Card className="p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Valeur Totale</p>
                    <p className="h4 text-success mb-0">{dashboardStats?.total_value ? Number(dashboardStats.total_value).toLocaleString() : 0} FCFA</p>
                  </div>
                  <div className="bg-success bg-opacity-10 rounded p-3">
                    <CheckCircle className="text-success" size={24} />
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="col-md-3">
              <Card className="p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Alertes Stock</p>
                    <p className="h4 text-warning mb-0">{dashboardStats?.low_stock_count || 0}</p>
                  </div>
                  <div className="bg-warning bg-opacity-10 rounded p-3">
                    <ExclamationTriangle className="text-warning" size={24} />
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="col-md-3">
              <Card className="p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Catégories</p>
                    <p className="h4 text-info mb-0">{dashboardStats?.categories_count || 0}</p>
                  </div>
                  <div className="bg-info bg-opacity-10 rounded p-3">
                    <Filter className="text-info" size={24} />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Alertes de stock bas */}
          {lowStockAlerts.length > 0 && (
            <Alert variant="warning" className="mb-4">
              <div className="d-flex align-items-center">
                <ExclamationTriangle className="me-2" size={20} />
                <strong>Alertes de stock faible</strong>
              </div>
              <p className="mb-0 mt-2">
                {lowStockAlerts.length} article(s) ont un stock faible : {lowStockAlerts.map(item => item.nom).join(', ')}
              </p>
            </Alert>
          )}

          {/* Filtres et recherche */}
          <Card className="p-4 mb-4">
            <div className="row">
              <div className="col-md-4">
                <label className="form-label">Recherche</label>
                <div className="position-relative">
                  <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                  <input
                    type="text"
                    className="form-control ps-5"
                    placeholder="Rechercher un article..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label">Catégorie</label>
                <select
                  className="form-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Toutes catégories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">État</label>
                <select
                  className="form-select"
                  value={filterEtat}
                  onChange={(e) => setFilterEtat(e.target.value)}
                >
                  <option value="">Tous états</option>
                  {etats.map(etat => (
                    <option key={etat} value={etat}>{etat}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('list')}
                    title="Vue liste"
                  >
                    <List size={16} />
                  </button>
                  <button
                    type="button"
                    className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setViewMode('grid')}
                    title="Vue grille"
                  >
                    <Grid size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Tableau d'inventaire */}
          <Card>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Article</span>
                        <small className="text-muted">Liste des articles ({filteredInventory.length})</small>
                      </div>
                    </th>
                    <th>Catégorie</th>
                    <th>Quantité</th>
                    <th>État</th>
                    <th>Localisation</th>
                    <th>Responsable</th>
                    <th width="100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div>
                          <div className="fw-medium">{item.nom}</div>
                          <small className="text-muted">N° {item.numero_serie}</small>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{item.categorie}</span>
                      </td>
                      <td>
                        <div>
                          <span className={item.quantite <= item.quantite_min ? 'text-danger fw-bold' : ''}>
                            {item.quantite}
                          </span>
                          <small className="text-muted"> / {item.quantite_min} min</small>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getEtatColor(item.etat)}`}>
                          {item.etat}
                        </span>
                      </td>
                      <td className="text-muted small">{item.localisation}</td>
                      <td className="text-muted small">{item.responsable}</td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => handleEdit(item)}
                            title="Modifier"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteClick(item)}
                            title="Supprimer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredInventory.length === 0 && (
              <div className="text-center py-5 text-muted">
                <Archive size={48} className="mb-3 opacity-50" />
                <p>Aucun article trouvé avec ces critères de recherche.</p>
              </div>
            )}
          </Card>

          {/* Modaux */}
          <Modal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            title="Ajouter un article"
            size="lg"
          >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Nom de l'article *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nom}
                      onChange={(e) => setFormData({...formData, nom: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Catégorie *</label>
                    <select
                      className="form-select"
                      value={formData.categorie}
                      onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                      required
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Quantité *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.quantite}
                      onChange={(e) => setFormData({...formData, quantite: e.target.value})}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Quantité minimale *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.quantiteMin}
                      onChange={(e) => setFormData({...formData, quantiteMin: e.target.value})}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">État *</label>
                    <select
                      className="form-select"
                      value={formData.etat}
                      onChange={(e) => setFormData({...formData, etat: e.target.value})}
                      required
                    >
                      {etats.map(etat => (
                        <option key={etat} value={etat}>{etat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Localisation *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.localisation}
                      onChange={(e) => setFormData({...formData, localisation: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Date d'achat</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.dateAchat}
                      onChange={(e) => setFormData({...formData, dateAchat: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Prix unitaire (FCFA)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.prix}
                      onChange={(e) => setFormData({...formData, prix: e.target.value})}
                      min="0"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Numéro de série</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.numeroSerie}
                      onChange={(e) => setFormData({...formData, numeroSerie: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Responsable *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.responsable}
                      onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="d-flex justify-content-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  Ajouter
                </Button>
              </div>
            </form>
          </Modal>

          {/* Modal de modification */}
          <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title="Modifier l'article"
            size="lg"
          >
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Nom de l'article *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.nom}
                      onChange={(e) => setFormData({...formData, nom: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Catégorie *</label>
                    <select
                      className="form-select"
                      value={formData.categorie}
                      onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                      required
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Quantité *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.quantite}
                      onChange={(e) => setFormData({...formData, quantite: e.target.value})}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Quantité minimale *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.quantiteMin}
                      onChange={(e) => setFormData({...formData, quantiteMin: e.target.value})}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">État *</label>
                    <select
                      className="form-select"
                      value={formData.etat}
                      onChange={(e) => setFormData({...formData, etat: e.target.value})}
                      required
                    >
                      {etats.map(etat => (
                        <option key={etat} value={etat}>{etat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Localisation *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.localisation}
                      onChange={(e) => setFormData({...formData, localisation: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Date d'achat</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.dateAchat}
                      onChange={(e) => setFormData({...formData, dateAchat: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Prix unitaire (FCFA)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.prix}
                      onChange={(e) => setFormData({...formData, prix: e.target.value})}
                      min="0"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Numéro de série</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.numeroSerie}
                      onChange={(e) => setFormData({...formData, numeroSerie: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Responsable *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.responsable}
                      onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="d-flex justify-content-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  Modifier
                </Button>
              </div>
            </form>
          </Modal>

          {/* Modal de suppression */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Supprimer l'article"
          >
            <p>Êtes-vous sûr de vouloir supprimer cet article ?</p>
            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
              >
                Supprimer
              </Button>
            </div>
          </Modal>

        </div>
      </div>
    </div>
  );
};

export default InventoryModule;