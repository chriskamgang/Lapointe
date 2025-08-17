import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, Search, BarChart3, TrendingUp, MessageCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { host } from '../../utils/fetch';
import InventoryDashboard from './components/InventoryDashboard';
import StockMovements from './components/StockMovements';
import WhatsAppAlerts from './components/WhatsAppAlerts';

const InventoryFull = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [etats, setEtats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEtat, setFilterEtat] = useState('');
  
  // View mode
  const [viewMode, setViewMode] = useState('list'); // 'list', 'dashboard', ou 'alerts'
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
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

  const API_BASE =  `${host}/api`;
  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  };

  const loadItems = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterEtat) params.append('etat', filterEtat);
      
      const response = await apiCall(`/inventory?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.data) {
          setItems(data.data.data);
        } else {
          setItems([]);
        }
      } else {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Erreur: ' + err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await apiCall('/inventory/config');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.data.categories || []);
          setEtats(data.data.etats || []);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la config:', err);
    }
  };

  useEffect(() => {
    loadItems();
    loadConfig();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterCategory, filterEtat]);

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
    setLoading(true);
    setError('');
    
    try {
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

      let response;
      if (selectedItem) {
        // Modification
        response = await apiCall(`/inventory/${selectedItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(articleData)
        });
      } else {
        // Création
        response = await apiCall('/inventory', {
          method: 'POST',
          body: JSON.stringify(articleData)
        });
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess(selectedItem ? 'Article modifié avec succès !' : 'Article ajouté avec succès !');
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
          setSelectedItem(null);
          await loadItems();
        } else {
          throw new Error(result.message || 'Erreur lors de la sauvegarde');
        }
      } else {
        const errorData = await response.json();
        if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors).flat().join(', ');
          throw new Error(`Erreur de validation: ${errorMessages}`);
        } else {
          throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err.message);
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
    setLoading(true);
    setError('');
    
    try {
      const response = await apiCall(`/inventory/${selectedItem.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Article supprimé avec succès !');
          setShowDeleteModal(false);
          setSelectedItem(null);
          await loadItems();
        } else {
          throw new Error(result.message || 'Erreur lors de la suppression');
        }
      } else {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterEtat) params.append('etat', filterEtat);

      const response = await apiCall(`/inventory/export?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const dataStr = JSON.stringify(data.data, null, 2);
          const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
          
          const exportFileDefaultName = `inventaire_${new Date().toISOString().split('T')[0]}.json`;
          
          const linkElement = document.createElement('a');
          linkElement.setAttribute('href', dataUri);
          linkElement.setAttribute('download', exportFileDefaultName);
          linkElement.click();
          
          setSuccess(`Export réalisé avec succès (${data.count} articles)`);
        }
      }
    } catch (err) {
      setError('Erreur lors de l\'export: ' + err.message);
    }
  };

  const getEtatColor = (etat) => {
    switch(etat) {
      case 'Excellent': return 'bg-success';
      case 'Bon': return 'bg-primary';
      case 'Moyen': return 'bg-warning';
      case 'Mauvais': return 'bg-danger';
      case 'Hors service': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = searchTerm === '' || 
                       item.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.localisation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.responsable?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.categorie === filterCategory;
    const matchEtat = !filterEtat || item.etat === filterEtat;
    return matchSearch && matchCategory && matchEtat;
  });

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <h3 className="mb-0">📦 Gestion d'Inventaire</h3>
                <small>Bienvenue {user?.name} - Gérez l'inventaire des équipements</small>
              </div>
              <div className="d-flex gap-2">
                <div className="btn-group me-2" role="group">
                  <button 
                    type="button" 
                    className={`btn ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('dashboard')}
                  >
                    <BarChart3 size={16} className="me-1" />
                    Dashboard
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <Search size={16} className="me-1" />
                    Liste
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${viewMode === 'alerts' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setViewMode('alerts')}
                  >
                    <MessageCircle size={16} className="me-1" />
                    Alertes
                  </button>
                </div>
                <button 
                  className="btn btn-light btn-sm" 
                  onClick={exportData}
                  disabled={loading}
                >
                  <Download size={16} className="me-1" />
                  Export JSON
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                >
                  <Plus size={16} className="me-1" />
                  Nouvel Article
                </button>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}
          
          {success && (
            <div className="alert alert-success alert-dismissible fade show">
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Dashboard, Liste ou Alertes selon le mode */}
          {viewMode === 'dashboard' ? (
            <InventoryDashboard onRefresh={loadItems} />
          ) : viewMode === 'alerts' ? (
            <WhatsAppAlerts />
          ) : (
            <>
              {/* Filtres */}
              <div className="card mb-4">
                <div className="card-body">
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
                    <div className="col-md-4">
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
                    <div className="col-md-4">
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
                  </div>
                </div>
              </div>

              {/* Tableau */}
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Liste des articles ({filteredItems.length})</h5>
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
                  {loading && (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Chargement...</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {!loading && filteredItems.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        Aucun article trouvé avec ces critères de recherche
                      </td>
                    </tr>
                  )}
                  
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div>
                          <div className="fw-bold">{item.nom}</div>
                          {item.numero_serie && (
                            <small className="text-muted">N° {item.numero_serie}</small>
                          )}
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
                          {item.quantite_min && (
                            <small className="text-muted"> / {item.quantite_min} min</small>
                          )}
                          {item.quantite <= (item.quantite_min || 0) && (
                            <div><small className="badge bg-warning">Stock faible</small></div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getEtatColor(item.etat)}`}>
                          {item.etat}
                        </span>
                      </td>
                      <td className="text-muted small">{item.localisation || '-'}</td>
                      <td className="text-muted small">{item.responsable || '-'}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-info"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowStockModal(true);
                            }}
                            title="Gérer Stock"
                          >
                            <TrendingUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() => handleEdit(item)}
                            title="Modifier"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteClick(item)}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Ajout/Modification */}
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
                  <form onSubmit={handleSubmit}>
                    <div className="modal-body">
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
                        <div className="col-12">
                          <div className="mb-3">
                            <label className="form-label">Description</label>
                            <textarea
                              className="form-control"
                              rows="3"
                              value={formData.description}
                              onChange={(e) => setFormData({...formData, description: e.target.value})}
                            ></textarea>
                          </div>
                        </div>
                      </div>
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
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Enregistrement...' : (selectedItem ? 'Modifier' : 'Ajouter')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Modal Gestion Stock */}
          {showStockModal && selectedItem && (
            <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
              <div className="modal-dialog modal-xl">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Gestion des Stocks - {selectedItem.nom}</h5>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => {
                        setShowStockModal(false);
                        setSelectedItem(null);
                      }}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <StockMovements 
                      item={selectedItem} 
                      onMovementRecorded={(updatedItem) => {
                        // Mettre à jour l'item dans la liste
                        setItems(prevItems => 
                          prevItems.map(item => 
                            item.id === updatedItem.id ? updatedItem : item
                          )
                        );
                        setSelectedItem(updatedItem);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Suppression */}
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
                        <br />
                        <small>Cette action est irréversible.</small>
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
          
            </>
          )}

          {/* Background overlay pour les modals */}
          {(showAddModal || showEditModal || showDeleteModal || showStockModal) && (
            <div className="modal-backdrop fade show"></div>
          )}

        </div>
      </div>
    </div>
  );
};

export default InventoryFull;
