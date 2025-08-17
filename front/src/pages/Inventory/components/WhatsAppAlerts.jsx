import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Settings,
  RefreshCw,
  Bell
} from 'lucide-react';
import { host } from '../../../utils/fetch';

const WhatsAppAlerts = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

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

  const loadLowStockItems = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await apiCall('/inventory/low-stock-items');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLowStockItems(data.data.items || []);
          setStats(data.data.stats || {});
        }
      } else {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des articles en stock faible:', err);
      setError('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testWhatsAppConfig = async () => {
    setTestLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiCall('/inventory/test-whatsapp', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Erreur lors du test WhatsApp:', err);
      setError('Erreur lors du test: ' + err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const sendLowStockAlert = async () => {
    setSendLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiCall('/inventory/send-low-stock-alert', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`${result.message} (${result.low_stock_count} articles concernés)`);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi de l\'alerte:', err);
      setError('Erreur lors de l\'envoi: ' + err.message);
    } finally {
      setSendLoading(false);
    }
  };

  useEffect(() => {
    loadLowStockItems();
  }, []);

  const getStockLevelIcon = (item) => {
    if (item.quantite <= 0) return <XCircle className="text-danger" size={16} />;
    if (item.quantite <= (item.quantite_min / 2)) return <AlertTriangle className="text-warning" size={16} />;
    return <AlertTriangle className="text-info" size={16} />;
  };

  const getStockLevelText = (item) => {
    if (item.quantite <= 0) return 'RUPTURE';
    if (item.quantite <= (item.quantite_min / 2)) return 'CRITIQUE';
    return 'FAIBLE';
  };

  const getStockLevelColor = (item) => {
    if (item.quantite <= 0) return 'text-danger';
    if (item.quantite <= (item.quantite_min / 2)) return 'text-warning';
    return 'text-info';
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="card mb-4">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">
                  <MessageCircle size={24} className="me-2" />
                  Alertes WhatsApp - Stock Faible
                </h4>
                <small>Configuration et envoi d'alertes automatiques</small>
              </div>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-light btn-sm" 
                  onClick={loadLowStockItems}
                  disabled={loading}
                >
                  <RefreshCw size={16} className="me-1" />
                  Actualiser
                </button>
                <button 
                  className="btn btn-outline-light btn-sm" 
                  onClick={testWhatsAppConfig}
                  disabled={testLoading}
                >
                  <Settings size={16} className="me-1" />
                  {testLoading ? 'Test...' : 'Tester Config'}
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

          {/* Statistiques */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 className="text-warning mb-0">{stats.total_low_stock || 0}</h3>
                      <small className="text-muted">Articles en stock faible</small>
                    </div>
                    <AlertTriangle className="text-warning" size={32} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 className="text-danger mb-0">{stats.critical_items || 0}</h3>
                      <small className="text-muted">Articles critiques</small>
                    </div>
                    <XCircle className="text-danger" size={32} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-dark">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 className="text-dark mb-0">{stats.out_of_stock || 0}</h3>
                      <small className="text-muted">En rupture</small>
                    </div>
                    <XCircle className="text-dark" size={32} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-info">
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h3 className="text-info mb-0">{stats.categories_affected || 0}</h3>
                      <small className="text-muted">Catégories affectées</small>
                    </div>
                    <Bell className="text-info" size={32} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action de notification */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">Envoyer l'alerte WhatsApp</h5>
                  <p className="text-muted mb-0">
                    {lowStockItems.length > 0 
                      ? `${lowStockItems.length} article(s) nécessitent une attention particulière` 
                      : 'Aucun article en stock faible actuellement'}
                  </p>
                </div>
                <button 
                  className="btn btn-success btn-lg"
                  onClick={sendLowStockAlert}
                  disabled={sendLoading || lowStockItems.length === 0}
                >
                  <Send size={20} className="me-2" />
                  {sendLoading ? 'Envoi...' : 'Envoyer Alerte'}
                </button>
              </div>
            </div>
          </div>

          {/* Liste des articles */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Articles en stock faible ({lowStockItems.length})</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                </div>
              ) : lowStockItems.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Article</th>
                        <th>Catégorie</th>
                        <th>Stock</th>
                        <th>Niveau</th>
                        <th>Localisation</th>
                        <th>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item) => (
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
                              <span className={`fw-bold ${getStockLevelColor(item)}`}>
                                {item.quantite}
                              </span>
                              <small className="text-muted"> / {item.quantite_min} min</small>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              {getStockLevelIcon(item)}
                              <span className={`ms-1 fw-bold ${getStockLevelColor(item)}`}>
                                {getStockLevelText(item)}
                              </span>
                            </div>
                          </td>
                          <td className="text-muted small">{item.localisation || '-'}</td>
                          <td className="text-muted small">{item.responsable || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <CheckCircle size={64} className="mb-3 opacity-50" />
                  <h5>Tous les stocks sont à niveau !</h5>
                  <p className="mb-0">Aucun article ne nécessite de réapprovisionnement pour le moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAlerts;
