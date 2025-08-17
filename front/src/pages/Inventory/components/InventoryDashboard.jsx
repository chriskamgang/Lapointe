import React, { useState, useEffect } from 'react';
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Grid, 
  TrendingUp, 
  Calendar, 
  MapPin,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react';
import { host } from '../../../utils/fetch';

const InventoryDashboard = ({ onRefresh }) => {
  const [stats, setStats] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = host+'/api';

  const apiCall = async (url) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [statsResponse, itemsResponse] = await Promise.all([
        apiCall('/inventory/dashboard'),
        apiCall('/inventory')
      ]);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data.stats);
        }
      }
      
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        if (itemsData.success && itemsData.data && itemsData.data.data) {
          setArticles(itemsData.data.data);
        }
      }
    } catch (err) {
      console.error('Erreur dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStateDistribution = () => {
    const distribution = {};
    articles.forEach(article => {
      distribution[article.etat] = (distribution[article.etat] || 0) + 1;
    });
    return distribution;
  };

  const getCategoryDistribution = () => {
    const distribution = {};
    articles.forEach(article => {
      distribution[article.categorie] = (distribution[article.categorie] || 0) + 1;
    });
    return distribution;
  };

  const getLocationDistribution = () => {
    const distribution = {};
    articles.forEach(article => {
      if (article.localisation) {
        distribution[article.localisation] = (distribution[article.localisation] || 0) + 1;
      }
    });
    return distribution;
  };

  const getRecentArticles = () => {
    return articles
      .filter(article => article.date_achat)
      .sort((a, b) => new Date(b.date_achat) - new Date(a.date_achat))
      .slice(0, 5);
  };

  const getLowStockAlerts = () => {
    return articles.filter(article => article.quantite <= (article.quantite_min || 0));
  };

  const stateDistribution = getStateDistribution();
  const categoryDistribution = getCategoryDistribution();
  const locationDistribution = getLocationDistribution();
  const recentArticles = getRecentArticles();
  const lowStockAlerts = getLowStockAlerts();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Excellent': return 'bg-success';
      case 'Bon': return 'bg-primary';
      case 'Moyen': return 'bg-warning';
      case 'Mauvais': return 'bg-danger';
      case 'Hors service': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement du dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h6>Erreur lors du chargement du dashboard</h6>
        <p className="mb-2">{error}</p>
        <button className="btn btn-sm btn-outline-danger" onClick={loadDashboardData}>
          Réessayer
        </button>
      </div>
    );
  }

  const totalValue = articles.reduce((sum, item) => sum + (item.prix * item.quantite), 0);
  const averageValue = articles.length > 0 ? totalValue / articles.length : 0;

  return (
    <div>
      {/* Header avec bouton refresh */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="text-primary mb-0">📊 Dashboard Inventaire</h4>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={loadDashboardData}
          disabled={loading}
        >
          <RefreshCw size={16} className="me-1" />
          Actualiser
        </button>
      </div>

      {/* Cartes statistiques principales */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                  <Package className="text-primary" size={32} />
                </div>
              </div>
              <h5 className="card-title text-primary fw-bold">
                {stats?.total_articles || articles.length}
              </h5>
              <p className="card-text text-muted mb-0">Total Articles</p>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-success bg-opacity-10 p-3">
                  <DollarSign className="text-success" size={32} />
                </div>
              </div>
              <h6 className="card-title text-success fw-bold">
                {formatCurrency(stats?.total_value || totalValue)}
              </h6>
              <p className="card-text text-muted mb-0">Valeur Totale</p>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                  <AlertTriangle className="text-warning" size={32} />
                </div>
              </div>
              <h5 className="card-title text-warning fw-bold">
                {stats?.low_stock_count || lowStockAlerts.length}
              </h5>
              <p className="card-text text-muted mb-0">Alertes Stock</p>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div className="rounded-circle bg-info bg-opacity-10 p-3">
                  <Grid className="text-info" size={32} />
                </div>
              </div>
              <h5 className="card-title text-info fw-bold">
                {stats?.categories_count || Object.keys(categoryDistribution).length}
              </h5>
              <p className="card-text text-muted mb-0">Catégories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertes stock faible */}
      {lowStockAlerts.length > 0 && (
        <div className="alert alert-warning border-0 shadow-sm mb-4">
          <div className="d-flex align-items-center mb-3">
            <AlertTriangle className="me-2" size={20} />
            <h6 className="mb-0 fw-bold">
              Alertes Stock Faible ({lowStockAlerts.length} article(s))
            </h6>
          </div>
          <div className="row">
            {lowStockAlerts.slice(0, 3).map(article => (
              <div key={article.id} className="col-md-4 mb-2">
                <div className="d-flex align-items-center p-2 bg-white rounded shadow-sm">
                  <Package className="text-danger me-2" size={20} />
                  <div className="flex-grow-1">
                    <div className="fw-bold text-danger">{article.nom}</div>
                    <small className="text-muted">{article.categorie}</small>
                  </div>
                  <span className="badge bg-danger">{article.quantite}</span>
                </div>
              </div>
            ))}
          </div>
          {lowStockAlerts.length > 3 && (
            <small className="text-muted">
              ... et {lowStockAlerts.length - 3} autre(s) article(s) en stock faible
            </small>
          )}
        </div>
      )}

      {/* Graphiques et analyses */}
      <div className="row mb-4">
        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent">
              <div className="d-flex align-items-center">
                <BarChart3 className="text-primary me-2" size={20} />
                <h6 className="mb-0">Répartition par État</h6>
              </div>
            </div>
            <div className="card-body">
              {Object.entries(stateDistribution).length > 0 ? (
                <div>
                  {Object.entries(stateDistribution).map(([state, count]) => {
                    const percentage = ((count / articles.length) * 100).toFixed(1);
                    return (
                      <div key={state} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className={`badge ${getStateColor(state)}`}>{state}</span>
                          <div>
                            <span className="me-2">{count} articles</span>
                            <span className="text-muted">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="progress" style={{height: '6px'}}>
                          <div 
                            className={`progress-bar ${getStateColor(state).replace('bg-', 'bg-')}`}
                            style={{width: `${percentage}%`}}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <BarChart3 size={48} className="opacity-50 mb-2" />
                  <p className="mb-0">Aucune donnée d'état disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent">
              <div className="d-flex align-items-center">
                <PieChart className="text-success me-2" size={20} />
                <h6 className="mb-0">Top 5 Catégories</h6>
              </div>
            </div>
            <div className="card-body">
              {Object.entries(categoryDistribution).length > 0 ? (
                <div>
                  {Object.entries(categoryDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([category, count], index) => {
                      const percentage = ((count / articles.length) * 100).toFixed(1);
                      const colors = ['success', 'primary', 'warning', 'info', 'secondary'];
                      const color = colors[index] || 'secondary';
                      
                      return (
                        <div key={category} className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-medium">{category}</span>
                            <div>
                              <span className="me-2">{count} articles</span>
                              <span className={`badge bg-${color}`}>{percentage}%</span>
                            </div>
                          </div>
                          <div className="progress" style={{height: '6px'}}>
                            <div 
                              className={`progress-bar bg-${color}`}
                              style={{width: `${percentage}%`}}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <PieChart size={48} className="opacity-50 mb-2" />
                  <p className="mb-0">Aucune donnée de catégorie disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent">
              <div className="d-flex align-items-center">
                <Calendar className="text-info me-2" size={20} />
                <h6 className="mb-0">Articles Récents</h6>
              </div>
            </div>
            <div className="card-body">
              {recentArticles.length > 0 ? (
                <div>
                  {recentArticles.map(article => (
                    <div key={article.id} className="d-flex align-items-center mb-3">
                      <Package className="text-muted me-2" size={20} />
                      <div className="flex-grow-1">
                        <div className="fw-bold">{article.nom}</div>
                        <small className="text-muted">
                          {new Date(article.date_achat).toLocaleDateString('fr-FR')} - {formatCurrency(article.prix)}
                        </small>
                      </div>
                      <span className={`badge ${getStateColor(article.etat)}`}>
                        {article.etat}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <Calendar size={48} className="opacity-50 mb-2" />
                  <p className="mb-0">Aucun article récent</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent">
              <div className="d-flex align-items-center">
                <MapPin className="text-warning me-2" size={20} />
                <h6 className="mb-0">Top Localisations</h6>
              </div>
            </div>
            <div className="card-body">
              {Object.entries(locationDistribution).length > 0 ? (
                <div>
                  {Object.entries(locationDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([location, count]) => (
                      <div key={location} className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center">
                          <MapPin className="text-muted me-2" size={16} />
                          <span>{location}</span>
                        </div>
                        <span className="badge bg-warning">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <MapPin size={48} className="opacity-50 mb-2" />
                  <p className="mb-0">Aucune donnée de localisation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Résumé financier */}
      <div className="card border-0 shadow-sm mb-4" 
           style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
        <div className="card-body text-white">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h5 className="text-white mb-1">Résumé de l'Inventaire</h5>
              <p className="text-white-50 mb-0">
                Collège Polyvalent Bilingue de Douala
              </p>
            </div>
            <TrendingUp className="text-white-50" size={32} />
          </div>
          <div className="row text-center">
            <div className="col-md-3">
              <div className="mb-2">
                <h6 className="text-white mb-1">Articles Excellents</h6>
                <div className="h4 text-white fw-bold">{stateDistribution['Excellent'] || 0}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="mb-2">
                <h6 className="text-white mb-1">Valeur Moyenne</h6>
                <div className="h6 text-white fw-bold">
                  {formatCurrency(averageValue)}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="mb-2">
                <h6 className="text-white mb-1">Besoin d'Attention</h6>
                <div className="h4 text-white fw-bold">
                  {(stateDistribution['Mauvais'] || 0) + (stateDistribution['Hors service'] || 0)}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="mb-2">
                <h6 className="text-white mb-1">Taux Opérationnel</h6>
                <div className="h4 text-white fw-bold">
                  {articles.length > 0 
                    ? Math.round(((stateDistribution['Excellent'] || 0) + (stateDistribution['Bon'] || 0)) / articles.length * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
