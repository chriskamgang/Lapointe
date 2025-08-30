import { api } from '../utils/api';

/**
 * Service API pour la gestion des équipements scolaires
 */
export const schoolEquipmentApi = {
    /**
     * Récupérer tous les équipements d'une école par son ID
     */
    async getEquipmentBySchoolId(schoolId, params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.level) queryParams.append('level', params.level);
            if (params.specialty) queryParams.append('specialty', params.specialty);
            if (params.equipment_type) queryParams.append('equipment_type', params.equipment_type);
            if (params.mandatory_only) queryParams.append('mandatory_only', params.mandatory_only);

            const url = `/school-equipment/school/${schoolId}/equipment${queryParams.toString() ? `?${queryParams}` : ''}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération des équipements par ID:', error);
            throw error;
        }
    },

    /**
     * Récupérer tous les équipements d'une école par son code
     */
    async getEquipmentBySchoolCode(schoolCode) {
        try {
            const response = await api.get(`/school-equipment/school-code/${schoolCode}/equipment`);
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération des équipements par code école:', error);
            throw error;
        }
    },

    /**
     * Récupérer les vêtements requis pour une école
     */
    async getRequiredClothing(schoolCode) {
        try {
            const response = await api.get(`/school-equipment/school-code/${schoolCode}/required-clothing`);
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération des vêtements requis:', error);
            throw error;
        }
    },

    /**
     * Récupérer les équipements par type
     */
    async getEquipmentByType(schoolCode, equipmentType) {
        try {
            const response = await this.getEquipmentBySchoolCode(schoolCode);
            if (response.success && response.data.equipment_by_type[equipmentType]) {
                return {
                    success: true,
                    data: {
                        school: response.data.school,
                        equipment: response.data.equipment_by_type[equipmentType]
                    }
                };
            }
            return { success: true, data: { school: response.data.school, equipment: [] } };
        } catch (error) {
            console.error(`Erreur lors de la récupération des équipements ${equipmentType}:`, error);
            throw error;
        }
    },

    /**
     * Vérifier le type d'uniforme requis (blouse ou polo)
     */
    async getUniformType(schoolCode) {
        try {
            const response = await this.getRequiredClothing(schoolCode);
            return {
                success: true,
                data: {
                    school: response.data.school,
                    uniform_type: response.data.uniform_type,
                    required_clothing: response.data.required_clothing
                }
            };
        } catch (error) {
            console.error('Erreur lors de la vérification du type d\'uniforme:', error);
            throw error;
        }
    },

    /**
     * Récupérer les équipements obligatoires seulement
     */
    async getMandatoryEquipment(schoolCode) {
        try {
            const response = await this.getEquipmentBySchoolCode(schoolCode);
            if (response.success) {
                const mandatoryEquipment = {};
                Object.keys(response.data.equipment_by_type).forEach(type => {
                    const mandatory = response.data.equipment_by_type[type].filter(item => item.is_mandatory);
                    if (mandatory.length > 0) {
                        mandatoryEquipment[type] = mandatory;
                    }
                });

                return {
                    success: true,
                    data: {
                        school: response.data.school,
                        equipment_by_type: mandatoryEquipment,
                        summary: {
                            total_mandatory: Object.values(mandatoryEquipment).flat().length,
                            types: Object.keys(mandatoryEquipment)
                        }
                    }
                };
            }
            return response;
        } catch (error) {
            console.error('Erreur lors de la récupération des équipements obligatoires:', error);
            throw error;
        }
    },

    /**
     * Calculer le coût total des équipements
     */
    calculateTotalCost(equipmentData) {
        if (!equipmentData.success || !equipmentData.data.equipment_by_type) {
            return { mandatory: 0, optional: 0, total: 0 };
        }

        let mandatoryCost = 0;
        let optionalCost = 0;

        Object.values(equipmentData.data.equipment_by_type).flat().forEach(item => {
            const price = parseFloat(item.price) || 0;
            if (item.is_mandatory) {
                mandatoryCost += price;
            } else {
                optionalCost += price;
            }
        });

        return {
            mandatory: mandatoryCost,
            optional: optionalCost,
            total: mandatoryCost + optionalCost
        };
    },

    /**
     * Filtrer les équipements par niveau et spécialité
     */
    filterEquipmentByLevel(equipmentData, level, specialty = null) {
        if (!equipmentData.success || !equipmentData.data.equipment_by_type) {
            return equipmentData;
        }

        const filteredEquipment = {};
        
        Object.keys(equipmentData.data.equipment_by_type).forEach(type => {
            const filtered = equipmentData.data.equipment_by_type[type].filter(item => {
                // Vérifier le niveau
                const levelMatch = !item.applicable_levels || 
                                   item.applicable_levels.includes(level);
                
                // Vérifier la spécialité si fournie
                const specialtyMatch = !specialty || 
                                       !item.applicable_specialties || 
                                       item.applicable_specialties.includes(specialty);
                
                return levelMatch && specialtyMatch;
            });
            
            if (filtered.length > 0) {
                filteredEquipment[type] = filtered;
            }
        });

        return {
            success: true,
            data: {
                school: equipmentData.data.school,
                equipment_by_type: filteredEquipment,
                summary: {
                    total_items: Object.values(filteredEquipment).flat().length,
                    mandatory_items: Object.values(filteredEquipment).flat().filter(item => item.is_mandatory).length,
                    types: Object.keys(filteredEquipment)
                },
                filters: { level, specialty }
            }
        };
    }
};