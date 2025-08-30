import api from '../utils/api';

/**
 * Service API pour la gestion des équipements scolaires (CRUD)
 */
export const equipmentManagementApi = {
    // Lister tous les équipements avec pagination et filtres
    async getEquipmentList(params = {}) {
        const response = await api.get('/school-equipment', { params });
        return response.data;
    },

    // Obtenir les statistiques des équipements
    async getStats() {
        const response = await api.get('/school-equipment/stats');
        return response.data;
    },

    // Obtenir un équipement spécifique
    async getEquipment(id) {
        const response = await api.get(`/school-equipment/${id}`);
        return response.data;
    },

    // Créer un nouvel équipement
    async createEquipment(equipmentData) {
        const response = await api.post('/school-equipment', equipmentData);
        return response.data;
    },

    // Mettre à jour un équipement
    async updateEquipment(id, equipmentData) {
        const response = await api.put(`/school-equipment/${id}`, equipmentData);
        return response.data;
    },

    // Supprimer un équipement
    async deleteEquipment(id) {
        const response = await api.delete(`/school-equipment/${id}`);
        return response.data;
    },

    // Activer/désactiver un équipement
    async toggleEquipmentStatus(id) {
        const response = await api.patch(`/school-equipment/${id}/toggle-status`);
        return response.data;
    },

    // Réordonner les équipements
    async reorderEquipment(orderData) {
        const response = await api.post('/school-equipment/reorder', orderData);
        return response.data;
    },

    // Obtenir la liste des écoles (pour les formulaires)
    async getSchools() {
        const response = await api.get('/schools');
        return response.data;
    },

    // Obtenir les niveaux et spécialités (pour les formulaires)
    async getLevels() {
        const response = await api.get('/levels');
        return response.data;
    },

    async getSchoolClasses() {
        const response = await api.get('/school-classes');
        return response.data;
    }
};

// Utilitaires pour les équipements
export const equipmentUtils = {
    // Types d'équipements disponibles
    getEquipmentTypes() {
        return [
            { value: 'clothing', label: 'Vêtements', icon: '👕' },
            { value: 'medical', label: 'Équipement médical', icon: '🏥' },
            { value: 'technical', label: 'Équipement technique', icon: '💻' },
            { value: 'security', label: 'Équipement de sécurité', icon: '🦺' },
            { value: 'academic', label: 'Fournitures académiques', icon: '📚' }
        ];
    },

    // Obtenir l'icône pour un type d'équipement
    getTypeIcon(type) {
        const types = this.getEquipmentTypes();
        const found = types.find(t => t.value === type);
        return found ? found.icon : '📦';
    },

    // Obtenir le label pour un type d'équipement
    getTypeLabel(type) {
        const types = this.getEquipmentTypes();
        const found = types.find(t => t.value === type);
        return found ? found.label : type;
    },

    // Obtenir la couleur pour un type d'équipement
    getTypeColor(type) {
        const colors = {
            clothing: 'bg-blue-100 text-blue-800 border-blue-200',
            medical: 'bg-green-100 text-green-800 border-green-200',
            technical: 'bg-purple-100 text-purple-800 border-purple-200',
            security: 'bg-orange-100 text-orange-800 border-orange-200',
            academic: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
        return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
    },

    // Formater le prix
    formatPrice(price) {
        if (!price || price === 0) return 'Gratuit';
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    },

    // Valider les données d'équipement
    validateEquipment(data) {
        const errors = {};

        if (!data.school_id) {
            errors.school_id = 'L\'école est requise';
        }

        if (!data.equipment_type) {
            errors.equipment_type = 'Le type d\'équipement est requis';
        }

        if (!data.item_name || data.item_name.trim() === '') {
            errors.item_name = 'Le nom de l\'équipement est requis';
        }

        if (data.price && (isNaN(data.price) || data.price < 0)) {
            errors.price = 'Le prix doit être un nombre positif';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

export default equipmentManagementApi;