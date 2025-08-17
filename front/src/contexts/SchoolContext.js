import React, { createContext, useContext, useState, useEffect } from 'react';
import { secureApiEndpoints } from '../utils/apiMigration';
import { host } from '../utils/fetch';

const SchoolContext = createContext();

export const useSchool = () => {
    const context = useContext(SchoolContext);
    if (!context) {
        throw new Error('useSchool must be used within a SchoolProvider');
    }
    return context;
};

export const SchoolProvider = ({ children }) => {
    const [schoolSettings, setSchoolSettings] = useState({
        school_name: 'COLLÈGE POLYVALENT BILINGUE DE DOUALA',
        school_motto: '',
        school_address: '',
        school_phone: '',
        school_email: '',
        school_website: '',
        school_logo: '',
        currency: 'FCFA',
        bank_name: '',
        country: '',
        city: '',
        footer_text: '',
        scholarship_deadline: '',
        reduction_percentage: 10,
        primary_color: '#007bff'
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadSchoolSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await secureApiEndpoints.schoolSettings.get();
            
            if (response.success && response.data) {
                setSchoolSettings(response.data);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des paramètres école:', err);
            setError('Erreur lors du chargement des paramètres de l\'école');
        } finally {
            setLoading(false);
        }
    };

    const updateSchoolSettings = async (newSettings) => {
        try {
            const response = await secureApiEndpoints.schoolSettings.update(newSettings);
            
            if (response.success && response.data) {
                setSchoolSettings(response.data);
                return { success: true, data: response.data };
            } else {
                return { success: false, message: response.message || 'Erreur lors de la mise à jour' };
            }
        } catch (err) {
            console.error('Erreur lors de la mise à jour des paramètres école:', err);
            return { success: false, message: 'Erreur lors de la mise à jour des paramètres' };
        }
    };

    const getLogoUrl = () => {
        if (!schoolSettings.school_logo) return null;
        
        // Si c'est déjà une URL complète
        if (schoolSettings.school_logo.startsWith('http')) {
            return schoolSettings.school_logo;
        }
        
        // Si c'est un chemin relatif, construire l'URL complète en utilisant l'host configuré
        return `${host}/storage/${schoolSettings.school_logo}`;
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '';
        return `${amount.toLocaleString()} ${schoolSettings.currency || 'FCFA'}`;
    };

    useEffect(() => {
        loadSchoolSettings();
    }, []);

    const value = {
        schoolSettings,
        loading,
        error,
        loadSchoolSettings,
        updateSchoolSettings,
        getLogoUrl,
        formatCurrency
    };

    return (
        <SchoolContext.Provider value={value}>
            {children}
        </SchoolContext.Provider>
    );
};