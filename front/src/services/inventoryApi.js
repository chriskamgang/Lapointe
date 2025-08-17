import axios from 'axios';
import { host } from '../utils/fetch';

const API_BASE_URL = `${host}/api`;

// Configuration axios avec token d'authentification
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class InventoryApiService {
  // Récupérer tous les articles avec filtres
  async getItems(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.etat) params.append('etat', filters.etat);
      if (filters.lowStock) params.append('low_stock', '1');
      if (filters.sortBy) params.append('sort_by', filters.sortBy);
      if (filters.sortOrder) params.append('sort_order', filters.sortOrder);
      if (filters.perPage) params.append('per_page', filters.perPage);

      const response = await api.get(`/inventory?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des articles:', error);
      throw this.handleError(error);
    }
  }

  // Récupérer les statistiques du dashboard
  async getDashboardStats() {
    try {
      const response = await api.get('/inventory/dashboard');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw this.handleError(error);
    }
  }

  // Récupérer la configuration (catégories, états)
  async getConfig() {
    try {
      const response = await api.get('/inventory/config');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration:', error);
      throw this.handleError(error);
    }
  }

  // Récupérer un article spécifique
  async getItem(id) {
    try {
      const response = await api.get(`/inventory/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'article:', error);
      throw this.handleError(error);
    }
  }

  // Créer un nouvel article
  async createItem(itemData) {
    try {
      const response = await api.post('/inventory', itemData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de l\'article:', error);
      throw this.handleError(error);
    }
  }

  // Mettre à jour un article
  async updateItem(id, itemData) {
    try {
      const response = await api.put(`/inventory/${id}`, itemData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'article:', error);
      throw this.handleError(error);
    }
  }

  // Supprimer un article
  async deleteItem(id) {
    try {
      const response = await api.delete(`/inventory/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'article:', error);
      throw this.handleError(error);
    }
  }

  // Mettre à jour la quantité d'un article
  async updateQuantity(id, quantite, operation = 'set') {
    try {
      const response = await api.patch(`/inventory/${id}/quantity`, {
        quantite,
        operation
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error);
      throw this.handleError(error);
    }
  }

  // Exporter les données en JSON
  async exportData(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.etat) params.append('etat', filters.etat);
      if (filters.lowStock) params.append('low_stock', '1');

      const response = await api.get(`/inventory/export?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'export des données:', error);
      throw this.handleError(error);
    }
  }

  // Gestion des erreurs
  handleError(error) {
    if (error.response) {
      // Erreur de réponse du serveur
      const { data, status } = error.response;
      
      if (status === 422 && data.errors) {
        // Erreur de validation
        return {
          type: 'validation',
          message: data.message || 'Erreur de validation',
          errors: data.errors
        };
      }
      
      return {
        type: 'server',
        message: data.message || 'Erreur serveur',
        status
      };
    } else if (error.request) {
      // Erreur de réseau
      return {
        type: 'network',
        message: 'Erreur de connexion au serveur'
      };
    } else {
      // Autre erreur
      return {
        type: 'unknown',
        message: error.message || 'Une erreur inattendue s\'est produite'
      };
    }
  }

  // Méthodes utilitaires pour compatibilité avec l'ancien code localStorage
  async getAllItems() {
    const response = await this.getItems();
    return response.success ? response.data.data : [];
  }

  async addItem(item) {
    const response = await this.createItem(item);
    return response.success ? response.data : null;
  }

  async editItem(id, item) {
    const response = await this.updateItem(id, item);
    return response.success ? response.data : null;
  }

  async removeItem(id) {
    const response = await this.deleteItem(id);
    return response.success;
  }

  async getStats() {
    const response = await this.getDashboardStats();
    return response.success ? response.data.stats : null;
  }

  async getLowStockAlerts() {
    const response = await this.getDashboardStats();
    return response.success ? response.data.low_stock_alerts : [];
  }
}

// Instance singleton
const inventoryApiService = new InventoryApiService();

export default inventoryApiService;