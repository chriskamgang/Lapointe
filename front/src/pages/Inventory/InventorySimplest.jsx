import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { host } from '../../utils/fetch';

const InventorySimplest = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  console.log('InventorySimplest: Rendering');

  const loadItems = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Test simple sans service complexe
      const response = await fetch(host + '/api/inventory', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.success && data.data && data.data.data) {
          setItems(data.data.data);
          setSuccess(`${data.data.data.length} articles chargés`);
        } else {
          setItems([]);
          setSuccess('Aucun article trouvé');
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

  useEffect(() => {
    loadItems();
  }, []);
  
  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h3 className="mb-0">📦 Gestion d'Inventaire</h3>
              <button 
                className="btn btn-light btn-sm" 
                onClick={loadItems}
                disabled={loading}
              >
                {loading ? 'Chargement...' : '🔄 Actualiser'}
              </button>
            </div>
            <div className="card-body">
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

              {/* User info */}
              <div className="alert alert-info">
                <strong>Utilisateur connecté:</strong> {user?.name || 'Inconnu'} ({user?.role || 'Aucun rôle'})
              </div>
              
              {/* Items table */}
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom</th>
                      <th>Catégorie</th>
                      <th>Quantité</th>
                      <th>État</th>
                      <th>Localisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan="6" className="text-center">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Chargement...</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {!loading && items.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">
                          Aucun article dans l'inventaire
                        </td>
                      </tr>
                    )}
                    
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td><strong>{item.nom}</strong></td>
                        <td>
                          <span className="badge bg-secondary">{item.categorie}</span>
                        </td>
                        <td>
                          <span className={item.quantite <= (item.quantite_min || 0) ? 'text-danger fw-bold' : ''}>
                            {item.quantite}
                          </span>
                          {item.quantite_min && (
                            <small className="text-muted"> / {item.quantite_min} min</small>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getEtatColor(item.etat)}`}>
                            {item.etat}
                          </span>
                        </td>
                        <td className="text-muted small">{item.localisation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Debug info */}
              <div className="mt-4">
                <details className="mb-3">
                  <summary className="btn btn-outline-secondary btn-sm">
                    🔧 Informations de debug
                  </summary>
                  <div className="mt-2 p-3 bg-light rounded">
                    <p><strong>Nombre d'articles:</strong> {items.length}</p>
                    <p><strong>État du chargement:</strong> {loading ? 'En cours' : 'Terminé'}</p>
                    <p><strong>Token présent:</strong> {localStorage.getItem('token') ? 'Oui' : 'Non'}</p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fonction utilitaire pour les couleurs d'état
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

export default InventorySimplest;
