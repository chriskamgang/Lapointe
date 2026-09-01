import api from '../utils/api';

/**
 * Service API pour la gestion des bourses universitaires IUP
 */
export const scholarshipApi = {
    // Calculer la bourse d'un étudiant selon son école et ses résultats
    async calculateScholarship(studentId, mentionBTS = null) {
        const response = await api.get(`/scholarships/calculate/${studentId}`, {
            params: { mention_bts: mentionBTS }
        });
        return response.data;
    },

    // Obtenir les bourses d'une école spécifique
    async getSchoolScholarships(schoolCode) {
        const response = await api.get(`/scholarships/school/${schoolCode}`);
        return response.data;
    },

    // Obtenir toutes les bourses disponibles
    async getAllScholarships(filters = {}) {
        const response = await api.get('/scholarships', { params: filters });
        return response.data;
    },

    // Obtenir les statistiques des bourses
    async getScholarshipStats() {
        const response = await api.get('/scholarships/stats');
        return response.data;
    },

    // Attribuer une bourse à un étudiant
    async assignScholarship(studentId, scholarshipData) {
        const response = await api.post(`/scholarships/assign/${studentId}`, scholarshipData);
        return response.data;
    },

    // Mettre à jour le statut d'une bourse
    async updateScholarshipStatus(scholarshipId, status) {
        const response = await api.patch(`/scholarships/${scholarshipId}/status`, { status });
        return response.data;
    },

    // Obtenir l'historique des bourses d'un étudiant
    async getStudentScholarshipHistory(studentId) {
        const response = await api.get(`/scholarships/student/${studentId}/history`);
        return response.data;
    }
};

/**
 * Utilitaires pour les calculs de bourses IUP
 */
export const scholarshipUtils = {
    /**
     * Calculer la bourse selon l'école et la mention
     */
    calculateAmount(schoolCode, levelType, mentionBTS = null, isLaptopEligible = true) {
        const calculations = {
            amount: 0,
            laptop: false,
            description: '',
            conditions: []
        };

        switch (schoolCode) {
            case 'INSSAS':
                // INSSAS : 150 000 FCFA + laptop pour TOUS les niveaux
                calculations.amount = 150000; // 150k FCFA
                calculations.laptop = true;
                calculations.description = `Bourse INSSAS ${levelType} - Formation santé`;
                calculations.conditions = [
                    'Formation dans le domaine de la santé',
                    'Inscription validée à l\'INSSAS - tous niveaux éligibles'
                ];
                break;

            case 'ESGIT':
                // ESGIT : Bourses pour étudiants ayant DÉJÀ obtenu leur BTS avec mention
                // Attribution selon mention BTS obtenue pour poursuite d'études (Licence, etc.)
                if (mentionBTS) {
                    switch (mentionBTS.toLowerCase()) {
                        case 'très bien':
                            calculations.amount = 150000; // 150k FCFA
                            calculations.laptop = true;
                            break;
                        case 'bien':
                            calculations.amount = 120000; // 120k FCFA 
                            calculations.laptop = false;
                            break;
                        case 'assez bien':
                            calculations.amount = 100000; // 100k FCFA
                            calculations.laptop = false;
                            break;
                        case 'passable':
                            calculations.amount = 50000; // 50k FCFA
                            calculations.laptop = false;
                            break;
                        default:
                            calculations.amount = 0;
                            calculations.laptop = false;
                    }
                    calculations.description = `Bourse ESGIT ${levelType} - Mention BTS "${mentionBTS}"`;
                    calculations.conditions = [
                        'BTS déjà obtenu avec mention',
                        `Poursuite d'études en ${levelType} à l'ESGIT`,
                        'Dossier d\'inscription validé'
                    ];
                } else {
                    // ESGIT sans mention BTS : Laptop offert seulement
                    calculations.amount = 0;
                    calculations.laptop = isLaptopEligible;
                    calculations.description = `ESGIT ${levelType} - Formation informatique sans bourse`;
                    calculations.conditions = [
                        'Formation en informatique/télécommunications à l\'ESGIT',
                        'Mention BTS requise pour bourse financière'
                    ];
                }
                break;

            case 'ISTPM':
                // ISTPM : 25 000 FCFA fixe pour tous les niveaux
                calculations.amount = 25000;
                calculations.laptop = false;
                calculations.description = `Bourse ISTPM ${levelType} - Formation professionnelle`;
                calculations.conditions = [
                    'Formation professionnalisante à l\'ISTPM',
                    'Inscription validée - tous niveaux éligibles'
                ];
                break;

            case 'ESJEC':
                // ESJEC : Laptop offert seulement
                calculations.amount = 0;
                calculations.laptop = isLaptopEligible;
                calculations.description = 'ESJEC - Formation commerce/juridique';
                calculations.conditions = ['Formation en commerce ou droit'];
                break;

            case 'ESSIT':
                // ESSIT : Laptop offert seulement
                calculations.amount = 0;
                calculations.laptop = isLaptopEligible;
                calculations.description = 'ESSIT - Formation sciences industrielles';
                calculations.conditions = ['Formation en sciences industrielles/BTP'];
                break;

            case 'ISTMS':
                // ISTMS : Pas de bourse spécifique mentionnée
                calculations.amount = 0;
                calculations.laptop = false;
                calculations.description = 'ISTMS - Formation médico-sanitaire';
                calculations.conditions = ['Formation médico-sanitaire'];
                break;

            default:
                calculations.description = 'École non reconnue pour les bourses IUP';
        }

        return calculations;
    },

    /**
     * Formater le montant de bourse
     */
    formatAmount(amount) {
        if (amount === 0) return 'Aucune bourse financière';
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
    },

    /**
     * Obtenir le badge de statut laptop
     */
    getLaptopBadge(isEligible) {
        return isEligible 
            ? { text: '💻 Laptop offert', class: 'bg-blue-100 text-blue-800' }
            : { text: 'Pas de laptop', class: 'bg-gray-100 text-gray-600' };
    },

    /**
     * Obtenir les mentions BTS disponibles pour ESGIT
     */
    getBTSMentions() {
        return [
            { value: 'très bien', label: 'Très Bien', amount: 150000, laptop: true },
            { value: 'bien', label: 'Bien', amount: 120000, laptop: false },
            { value: 'assez bien', label: 'Assez Bien', amount: 100000, laptop: false },
            { value: 'passable', label: 'Passable', amount: 50000, laptop: false }
        ];
    },

    /**
     * Valider une attribution de bourse
     */
    validateScholarshipAssignment(schoolCode, levelType, mentionBTS) {
        const errors = [];

        if (!schoolCode) {
            errors.push('Le code de l\'école est requis');
        }

        if (schoolCode === 'ESGIT' && levelType === 'BTS' && !mentionBTS) {
            errors.push('La mention BTS est requise pour les bourses ESGIT');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Calculer le total des avantages (bourse + laptop gratuit)
     */
    calculateTotalBenefits(schoolCode, levelType, mentionBTS) {
        const scholarship = this.calculateAmount(schoolCode, levelType, mentionBTS);
        
        return {
            scholarshipAmount: scholarship.amount,
            laptopOffered: scholarship.laptop,
            totalFinancialValue: scholarship.amount, // Seule la bourse compte financièrement
            description: scholarship.description,
            details: [
                scholarship.amount > 0 ? `Bourse financière: ${this.formatAmount(scholarship.amount)}` : null,
                scholarship.laptop ? `Laptop: Offert gratuitement` : null
            ].filter(Boolean)
        };
    }
};

export default scholarshipApi;