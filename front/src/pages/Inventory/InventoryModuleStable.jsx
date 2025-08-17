import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit as Pencil, 
  Trash2 as Trash, 
  Archive,
  AlertTriangle as ExclamationTriangle,
  CheckCircle,
  Download
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import inventoryApiService from '../../services/inventoryApi';

const InventoryModuleStable = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [etats, setEtats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEtat, setFilterEtat] = useState('');
  
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
    quantite_min: '',
    etat: 'Bon',
    localisation: '',
    responsable: '',
    prix: '',
    date_achat: '',
    numero_serie: '',
    description: ''
  });

  useEffect(() => {
    loadInventoryData();
    loadConfig();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [itemsResponse, dashboardResponse] = await Promise.all([
        inventoryApiService.getItems({ search: searchTerm, category: filterCategory, etat: filterEtat }),
        inventoryApiService.getDashboardStats()
      ]);
      
      if (itemsResponse.success) {
        setInventory(itemsResponse.data.data || []);
      }
      
      if (dashboardResponse.success) {
        setDashboardStats(dashboardResponse.data.stats);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Erreur lors du chargement des données: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await inventoryApiService.getConfig();
      if (response.success) {
        setCategories(response.data.categories || []);
        setEtats(response.data.etats || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: '',
      quantite: '',
      quantite_min: '',
      etat: 'Bon',
      localisation: '',
      responsable: '',
      prix: '',
      date_achat: '',
      numero_serie: '',
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      const articleData = {
        nom: formData.nom,
        categorie: formData.categorie,
        quantite: parseInt(formData.quantite) || 0,
        quantite_min: parseInt(formData.quantite_min) || 0,
        etat: formData.etat,
        localisation: formData.localisation,
        responsable: formData.responsable,
        date_achat: formData.date_achat || null,
        prix: parseFloat(formData.prix) || 0,
        numero_serie: formData.numero_serie || null,
        description: formData.description || null
      };

      if (selectedItem) {
        const response = await inventoryApiService.updateItem(selectedItem.id, articleData);
        if (response.success) {
          setSuccess('Article modifié avec succès !');
          setShowEditModal(false);
          await loadInventoryData();
        } else {
          throw new Error(response.message || 'Erreur lors de la modification');
        }
      } else {
        const response = await inventoryApiService.createItem(articleData);
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
        const errorMessages = Object.values(error.errors).flat().join(', ');
        setError(`Erreur de validation: ${errorMessages}`);
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
      quantite_min: item.quantite_min?.toString() || '',
      etat: item.etat || 'Bon',
      localisation: item.localisation || '',
      responsable: item.responsable || '',
      prix: item.prix?.toString() || '',
      date_achat: item.date_achat || '',
      numero_serie: item.numero_serie || '',
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
      
      const response = await inventoryApiService.deleteItem(selectedItem.id);
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
      
      const response = await inventoryApiService.exportData({
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
      case 'Excellent': return 'text-success';
      case 'Bon': return 'text-primary';
      case 'Moyen': return 'text-warning';
      case 'Mauvais': return 'text-danger';
      case 'Hors service': return 'text-dark';
      default: return 'text-secondary';
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchSearch = searchTerm === '' || 
                       item.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (item.localisation && item.localisation.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (item.responsable && item.responsable.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = !filterCategory || item.categorie === filterCategory;
    const matchEtat = !filterEtat || item.etat === filterEtat;
    
    return matchSearch && matchCategory && matchEtat;
  });

  if (loading && !inventory.length) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2">Chargement de l'inventaire...</p>
        </div>
      </div>
    );
  }

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
              <button
                className="btn btn-success d-flex align-items-center gap-2"
                onClick={exportData}
                disabled={loading}
              >
                <Download size={16} />
                Exporter JSON
              </button>
              <button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
              >
                <Plus size={16} />
                Nouvel Article
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}
          {success && (
            <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Dashboard Stats */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Total Articles</p>
                    <p className="h4 text-primary mb-0">{dashboardStats?.total_articles || 0}</p>
                  </div>
                  <div className="bg-primary bg-opacity-10 rounded p-3">
                    <Archive className="text-primary" size={24} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Valeur Totale</p>
                    <p className="h4 text-success mb-0">{dashboardStats?.total_value ? Number(dashboardStats.total_value).toLocaleString() : 0} FCFA</p>
                  </div>
                  <div className="bg-success bg-opacity-10 rounded p-3">
                    <CheckCircle className="text-success" size={24} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Alertes Stock</p>
                    <p className="h4 text-warning mb-0">{dashboardStats?.low_stock_count || 0}</p>
                  </div>
                  <div className="bg-warning bg-opacity-10 rounded p-3">
                    <ExclamationTriangle className="text-warning" size={24} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card p-4 h-100">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="text-muted small mb-1">Catégories</p>
                    <p className="h4 text-info mb-0">{dashboardStats?.categories_count || 0}</p>
                  </div>
                  <div className="bg-info bg-opacity-10 rounded p-3">
                    <Archive className="text-info" size={24} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="card p-4 mb-4">
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
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setTimeout(() => loadInventoryData(), 300);
                    }}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Catégorie</label>
                <select
                  className="form-select"
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setTimeout(() => loadInventoryData(), 300);
                  }}
                >
                  <option value="">Toutes catégories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">État</label>
                <select
                  className="form-select"
                  value={filterEtat}
                  onChange={(e) => {
                    setFilterEtat(e.target.value);
                    setTimeout(() => loadInventoryData(), 300);
                  }}
                >
                  <option value="">Tous états</option>
                  {etats.map(etat => (
                    <option key={etat} value={etat}>{etat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tableau d'inventaire */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Liste des articles ({filteredInventory.length})</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Article</th>
                    <th>Catégorie</th>
                    <th>Quantité</th>
                    <th>État</th>
                    <th>Localisation</th>
                    <th>Responsable</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div>
                          <div className="fw-medium">{item.nom}</div>
                          {item.numero_serie && <small className="text-muted">N° {item.numero_serie}</small>}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{item.categorie}</span>
                      </td>
                      <td>
                        <div>
                          <span className={item.quantite <= (item.quantite_min || 0) ? 'text-danger fw-bold' : ''}>
                            {item.quantite}
                          </span>
                          <small className="text-muted"> / {item.quantite_min || 0} min</small>
                        </div>
                      </td>
                      <td>
                        <span className={`fw-medium ${getEtatColor(item.etat)}`}>
                          {item.etat}
                        </span>
                      </td>
                      <td className="text-muted small">{item.localisation || '-'}</td>
                      <td className="text-muted small">{item.responsable || '-'}</td>
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
          </div>

          {/* Modal d'ajout/modification - Bootstrap Modal */}
          {(showAddModal || showEditModal) && (
            <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {selectedItem ? 'Modifier l\'article' : 'Ajouter un article'}
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setSelectedItem(null);
                        resetForm();
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleSubmit}>
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
                              value={formData.quantite_min}
                              onChange={(e) => setFormData({...formData, quantite_min: e.target.value})}
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
                            <label className="form-label">Date d'achat</label>
                            <input
                              type="date"
                              className="form-control"
                              value={formData.date_achat}
                              onChange={(e) => setFormData({...formData, date_achat: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Numéro de série</label>
                            <input
                              type="text"
                              className="form-control"
                              value={formData.numero_serie}
                              onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setSelectedItem(null);
                        resetForm();
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? 'Enregistrement...' : (selectedItem ? 'Modifier' : 'Ajouter')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de suppression */}
          {showDeleteModal && (
            <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Supprimer l'article</h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedItem(null);
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p>Êtes-vous sûr de vouloir supprimer cet article ?</p>
                    {selectedItem && (
                      <div className="alert alert-warning">
                        <strong>{selectedItem.nom}</strong> - {selectedItem.categorie}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedItem(null);
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={confirmDelete}
                      disabled={loading}
                    >
                      {loading ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Background overlay pour les modals */}
          {(showAddModal || showEditModal || showDeleteModal) && (
            <div className="modal-backdrop fade show"></div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InventoryModuleStable;