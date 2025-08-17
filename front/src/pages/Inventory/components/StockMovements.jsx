import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Settings, 
  History, 
  TrendingUp, 
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { host } from '../../../utils/fetch';

const StockMovements = ({ item, onMovementRecorded }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Form data
  const [movementData, setMovementData] = useState({
    type: 'adjustment',
    new_quantity: item?.quantite || 0,
    reason: '',
    notes: ''
  });

  const API_BASE = host+'/api';

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

  const loadMovements = async () => {
    if (!item?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await apiCall(`/inventory/${item.id}/movements`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMovements(data.data || []);
        }
      } else {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error('Erreur mouvements:', err);
      setError('Erreur lors du chargement des mouvements: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item?.id) {
      loadMovements();
    }
  }, [item?.id]);

  const handleSubmitMovement = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await apiCall(`/inventory/${item.id}/movements`, {
        method: 'POST',
        body: JSON.stringify(movementData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSuccess('Mouvement enregistré avec succès !');
          setShowMovementModal(false);
          resetForm();
          await loadMovements();
          
          // Notifier le composant parent
          if (onMovementRecorded) {
            onMovementRecorded(result.data.item);
          }
        } else {
          throw new Error(result.message || 'Erreur lors de l\'enregistrement');
        }
      } else {
        const errorData = await response.json();
        if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors).flat().join(', ');
          throw new Error(`Validation: ${errorMessages}`);
        } else {
          throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }
      }
    } catch (err) {
      console.error('Erreur mouvement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMovementData({
      type: 'adjustment',
      new_quantity: item?.quantite || 0,
      reason: '',
      notes: ''
    });
  };

  const getMovementTypeIcon = (type) => {
    switch (type) {
      case 'in': return <ArrowUpCircle className="text-success" size={16} />;
      case 'out': return <ArrowDownCircle className="text-danger" size={16} />;
      case 'adjustment': return <Settings className="text-warning" size={16} />;
      default: return <RefreshCw className="text-secondary" size={16} />;
    }
  };

  const getMovementTypeColor = (type) => {
    switch (type) {
      case 'in': return 'text-success';
      case 'out': return 'text-danger';
      case 'adjustment': return 'text-warning';
      default: return 'text-secondary';
    }
  };

  const getMovementTypeLabel = (type) => {
    switch (type) {
      case 'in': return 'Entrée';
      case 'out': return 'Sortie';
      case 'adjustment': return 'Ajustement';
      default: return type;
    }
  };

  const getQuantityChangeDisplay = (movement) => {
    const change = movement.quantity_change;
    if (change > 0) {
      return (
        <span className="text-success">
          <TrendingUp size={14} className="me-1" />
          +{change}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="text-danger">
          <TrendingDown size={14} className="me-1" />
          {change}
        </span>
      );
    } else {
      return (
        <span className="text-muted">
          <RefreshCw size={14} className="me-1" />
          0
        </span>
      );
    }
  };

  if (!item) {
    return (
      <div className="alert alert-info">
        <p className="mb-0">Sélectionnez un article pour voir ses mouvements de stock.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header avec actions */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 className="mb-1">Gestion des stocks - <strong>{item.nom}</strong></h6>
          <small className="text-muted">Stock actuel: {item.quantite} unités</small>
        </div>
        <div className="btn-group btn-group-sm">
          <button 
            className="btn btn-outline-primary"
            onClick={() => {
              resetForm();
              setShowMovementModal(true);
            }}
          >
            <Plus size={14} className="me-1" />
            Mouvement
          </button>
          <button 
            className="btn btn-outline-info"
            onClick={() => setShowHistoryModal(true)}
          >
            <History size={14} className="me-1" />
            Historique
          </button>
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

      {/* Mouvements récents */}
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Mouvements récents</h6>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={loadMovements}
              disabled={loading}
            >
              <RefreshCw size={14} className="me-1" />
              Actualiser
            </button>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : movements.length > 0 ? (
            <div className="list-group list-group-flush">
              {movements.slice(0, 5).map((movement, index) => (
                <div key={movement.id || index} className="list-group-item px-0">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="d-flex align-items-start">
                      <div className="me-2">
                        {getMovementTypeIcon(movement.type)}
                      </div>
                      <div>
                        <div className="fw-medium">
                          {getMovementTypeLabel(movement.type)} - {movement.reason}
                        </div>
                        <small className="text-muted">
                          Par {movement.user_name || 'Système'} le {movement.formatted_movement_date || new Date(movement.movement_date).toLocaleDateString('fr-FR')}
                        </small>
                        {movement.notes && (
                          <div className="small text-muted mt-1">
                            <em>{movement.notes}</em>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">
                        {getQuantityChangeDisplay(movement)}
                      </div>
                      <small className="text-muted">
                        {movement.quantity_before} → {movement.quantity_after}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted py-4">
              <History size={48} className="opacity-50 mb-2" />
              <p className="mb-0">Aucun mouvement de stock enregistré</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nouveau Mouvement */}
      {showMovementModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nouveau mouvement de stock</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowMovementModal(false);
                    resetForm();
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmitMovement}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Article</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={item.nom}
                      disabled 
                    />
                    <div className="form-text">Stock actuel: {item.quantite} unités</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Type de mouvement *</label>
                    <select
                      className="form-select"
                      value={movementData.type}
                      onChange={(e) => setMovementData({...movementData, type: e.target.value})}
                      required
                    >
                      <option value="adjustment">Ajustement</option>
                      <option value="in">Entrée en stock</option>
                      <option value="out">Sortie de stock</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Nouvelle quantité *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={movementData.new_quantity}
                      onChange={(e) => setMovementData({...movementData, new_quantity: parseInt(e.target.value) || 0})}
                      min="0"
                      required
                    />
                    {movementData.new_quantity !== item.quantite && (
                      <div className="form-text">
                        Changement: {movementData.new_quantity - item.quantite > 0 ? '+' : ''}{movementData.new_quantity - item.quantite} unités
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Raison du mouvement *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={movementData.reason}
                      onChange={(e) => setMovementData({...movementData, reason: e.target.value})}
                      placeholder="Ex: Achat, Vente, Inventaire physique..."
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes (optionnel)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={movementData.notes}
                      onChange={(e) => setMovementData({...movementData, notes: e.target.value})}
                      placeholder="Notes additionnelles..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowMovementModal(false);
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
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique complet */}
      {showHistoryModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Historique complet - {item.nom}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowHistoryModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {movements.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Changement</th>
                          <th>Avant/Après</th>
                          <th>Raison</th>
                          <th>Utilisateur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.map((movement, index) => (
                          <tr key={movement.id || index}>
                            <td className="small">
                              {movement.formatted_movement_date || new Date(movement.movement_date).toLocaleDateString('fr-FR')}
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                {getMovementTypeIcon(movement.type)}
                                <span className={`ms-1 small ${getMovementTypeColor(movement.type)}`}>
                                  {getMovementTypeLabel(movement.type)}
                                </span>
                              </div>
                            </td>
                            <td>{getQuantityChangeDisplay(movement)}</td>
                            <td className="small">
                              {movement.quantity_before} → {movement.quantity_after}
                            </td>
                            <td className="small">{movement.reason}</td>
                            <td className="small">{movement.user_name || 'Système'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">
                    <History size={48} className="opacity-50 mb-2" />
                    <p className="mb-0">Aucun mouvement enregistré</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Background overlay pour les modals */}
      {(showMovementModal || showHistoryModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default StockMovements;
