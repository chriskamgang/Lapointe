// Service pour la gestion de l'inventaire scolaire
// Utilise le localStorage pour la persistance des données (peut être remplacé par une API)

const STORAGE_KEY = 'college_inventory';

// Données d'exemple pour initialiser l'inventaire
const sampleData = [
  {
    id: 1,
    nom: 'Bureau directeur en acajou',
    categorie: 'Mobilier',
    quantite: 1,
    etat: 'Excellent',
    localisation: 'Bureau du directeur',
    responsable: 'M. NGONO Jean',
    prix: 450000,
    date_achat: '2023-01-15',
    numero_serie: 'BUR-2023-001',
    description: 'Bureau en bois d\'acajou massif avec tiroirs latéraux'
  },
  {
    id: 2,
    nom: 'Ordinateur portable HP EliteBook',
    categorie: 'Informatique',
    quantite: 3,
    etat: 'Bon',
    localisation: 'Salle informatique',
    responsable: 'Mme KOUAM Marie',
    prix: 380000,
    date_achat: '2023-02-10',
    numero_serie: 'HP-2023-045',
    description: 'Ordinateur portable HP EliteBook 840 G8, Intel i5, 8GB RAM, 256GB SSD'
  },
  {
    id: 3,
    nom: 'Tableau blanc interactif',
    categorie: 'Matériel pédagogique',
    quantite: 2,
    etat: 'Excellent',
    localisation: 'Salle de classe A1',
    responsable: 'M. BIYA Paul',
    prix: 650000,
    date_achat: '2023-03-05',
    numero_serie: 'TBI-2023-012',
    description: 'Tableau blanc interactif 85 pouces avec projecteur intégré'
  },
  {
    id: 4,
    nom: 'Chaises en plastique',
    categorie: 'Mobilier',
    quantite: 4,
    etat: 'Correct',
    localisation: 'Salle de réunion',
    responsable: 'Service général',
    prix: 8500,
    date_achat: '2022-09-15',
    numero_serie: 'CHA-2022-189',
    description: 'Chaises empilables en plastique renforcé, couleur bleue'
  },
  {
    id: 5,
    nom: 'Ballons de football',
    categorie: 'Equipement sportif',
    quantite: 2,
    etat: 'Défaillant',
    localisation: 'Terrain de sport',
    responsable: 'M. KAMTO Pierre',
    prix: 12000,
    date_achat: '2022-05-20',
    numero_serie: 'BAL-2022-034',
    description: 'Ballons de football réglementaires, nécessitent réparation'
  },
  {
    id: 6,
    nom: 'Ramettes de papier A4',
    categorie: 'Fournitures',
    quantite: 15,
    etat: 'Excellent',
    localisation: 'Bureau secrétariat',
    responsable: 'Mme FOGUE Esther',
    prix: 3500,
    date_achat: '2024-01-08',
    numero_serie: 'PAP-2024-001',
    description: 'Ramettes de papier blanc A4, 80g/m², paquet de 500 feuilles'
  },
  {
    id: 7,
    nom: 'Extincteur poudre ABC',
    categorie: 'Sécurité',
    quantite: 1,
    etat: 'Hors service',
    localisation: 'Couloir principal',
    responsable: 'Service sécurité',
    prix: 45000,
    date_achat: '2020-11-12',
    numero_serie: 'EXT-2020-008',
    description: 'Extincteur 6kg poudre ABC, nécessite révision'
  },
  {
    id: 8,
    nom: 'Réfrigérateur double porte',
    categorie: 'Cuisine',
    quantite: 1,
    etat: 'Bon',
    localisation: 'Cuisine cantine',
    responsable: 'M. NNANGA Joseph',
    prix: 285000,
    date_achat: '2023-06-18',
    numero_serie: 'REF-2023-002',
    description: 'Réfrigérateur Samsung 350L, classe énergétique A+'
  }
];

class InventoryService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    const existingData = localStorage.getItem(STORAGE_KEY);
    if (!existingData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    }
  }

  async getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des articles:', error);
      return [];
    }
  }

  async getById(id) {
    try {
      const articles = await this.getAll();
      return articles.find(article => article.id === parseInt(id));
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'article:', error);
      return null;
    }
  }

  async create(articleData) {
    try {
      const articles = await this.getAll();
      const newId = Math.max(...articles.map(a => a.id), 0) + 1;
      
      const newArticle = {
        id: newId,
        ...articleData,
        date_creation: new Date().toISOString()
      };

      articles.push(newArticle);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
      
      return newArticle;
    } catch (error) {
      console.error('Erreur lors de la création de l\'article:', error);
      throw error;
    }
  }

  async update(id, articleData) {
    try {
      const articles = await this.getAll();
      const index = articles.findIndex(article => article.id === parseInt(id));
      
      if (index === -1) {
        throw new Error('Article non trouvé');
      }

      articles[index] = {
        ...articles[index],
        ...articleData,
        id: parseInt(id),
        date_modification: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
      return articles[index];
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'article:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const articles = await this.getAll();
      const filteredArticles = articles.filter(article => article.id !== parseInt(id));
      
      if (filteredArticles.length === articles.length) {
        throw new Error('Article non trouvé');
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredArticles));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'article:', error);
      throw error;
    }
  }

  async search(query) {
    try {
      const articles = await this.getAll();
      const searchTerm = query.toLowerCase();
      
      return articles.filter(article =>
        article.nom.toLowerCase().includes(searchTerm) ||
        article.categorie.toLowerCase().includes(searchTerm) ||
        article.responsable?.toLowerCase().includes(searchTerm) ||
        article.localisation?.toLowerCase().includes(searchTerm) ||
        article.numero_serie?.toLowerCase().includes(searchTerm) ||
        article.description?.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      return [];
    }
  }

  async getByCategory(category) {
    try {
      const articles = await this.getAll();
      return articles.filter(article => article.categorie === category);
    } catch (error) {
      console.error('Erreur lors de la récupération par catégorie:', error);
      return [];
    }
  }

  async getByState(state) {
    try {
      const articles = await this.getAll();
      return articles.filter(article => article.etat === state);
    } catch (error) {
      console.error('Erreur lors de la récupération par état:', error);
      return [];
    }
  }

  async getLowStock(threshold = 5) {
    try {
      const articles = await this.getAll();
      return articles.filter(article => article.quantite <= threshold);
    } catch (error) {
      console.error('Erreur lors de la récupération des alertes stock:', error);
      return [];
    }
  }

  async getStats() {
    try {
      const articles = await this.getAll();
      
      const totalArticles = articles.length;
      const totalQuantity = articles.reduce((sum, article) => sum + article.quantite, 0);
      const totalValue = articles.reduce((sum, article) => sum + (article.prix * article.quantite), 0);
      
      const categoryDistribution = {};
      const stateDistribution = {};
      const locationDistribution = {};
      
      articles.forEach(article => {
        // Distribution par catégorie
        categoryDistribution[article.categorie] = (categoryDistribution[article.categorie] || 0) + 1;
        
        // Distribution par état
        stateDistribution[article.etat] = (stateDistribution[article.etat] || 0) + 1;
        
        // Distribution par localisation
        if (article.localisation) {
          locationDistribution[article.localisation] = (locationDistribution[article.localisation] || 0) + 1;
        }
      });

      const lowStockCount = articles.filter(article => article.quantite <= 5).length;
      const categoriesCount = Object.keys(categoryDistribution).length;
      
      return {
        totalArticles,
        totalQuantity,
        totalValue,
        lowStockCount,
        categoriesCount,
        categoryDistribution,
        stateDistribution,
        locationDistribution,
        averageValue: totalArticles > 0 ? totalValue / totalArticles : 0
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {
        totalArticles: 0,
        totalQuantity: 0,
        totalValue: 0,
        lowStockCount: 0,
        categoriesCount: 0,
        categoryDistribution: {},
        stateDistribution: {},
        locationDistribution: {},
        averageValue: 0
      };
    }
  }

  async exportData() {
    try {
      const articles = await this.getAll();
      const stats = await this.getStats();
      
      return {
        metadata: {
          exportDate: new Date().toISOString(),
          school: 'Collège Polyvalent Bilingue de Douala',
          totalArticles: articles.length,
          exportVersion: '1.0'
        },
        statistics: stats,
        articles: articles
      };
    } catch (error) {
      console.error('Erreur lors de l\'export des données:', error);
      throw error;
    }
  }

  async importData(data) {
    try {
      if (data.articles && Array.isArray(data.articles)) {
        // Validation basique des données
        const validArticles = data.articles.filter(article => 
          article.nom && 
          article.categorie && 
          typeof article.quantite === 'number' && 
          article.quantite > 0 &&
          typeof article.prix === 'number' &&
          article.prix >= 0
        );
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validArticles));
        return { success: true, imported: validArticles.length };
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (error) {
      console.error('Erreur lors de l\'import des données:', error);
      throw error;
    }
  }

  async clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.initializeData();
      return true;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      throw error;
    }
  }
}

// Créer une instance unique du service
export const inventoryService = new InventoryService();