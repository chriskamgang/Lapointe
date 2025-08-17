import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSchool } from './SchoolContext';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const { schoolSettings } = useSchool();
    const [primaryColor, setPrimaryColor] = useState('#007bff'); // Bootstrap blue par défaut

    // Couleurs prédéfinies
    const colorPresets = [
        { name: 'Bleu Bootstrap', value: '#007bff', description: 'Bleu classique de Bootstrap' },
        { name: 'Bleu Marine', value: '#0056b3', description: 'Bleu marine professionnel' },
        { name: 'Vert Émeraude', value: '#28a745', description: 'Vert émeraude moderne' },
        { name: 'Vert Forêt', value: '#198754', description: 'Vert forêt naturel' },
        { name: 'Rouge Cardinal', value: '#dc3545', description: 'Rouge cardinal vibrant' },
        { name: 'Rouge Bordeaux', value: '#c82333', description: 'Rouge bordeaux élégant' },
        { name: 'Orange Tangerine', value: '#fd7e14', description: 'Orange tangerine énergique' },
        { name: 'Orange Foncé', value: '#e8590c', description: 'Orange foncé chaleureux' },
        { name: 'Violet Royal', value: '#6f42c1', description: 'Violet royal sophistiqué' },
        { name: 'Indigo Profond', value: '#6610f2', description: 'Indigo profond mystérieux' },
        { name: 'Rose Magenta', value: '#e83e8c', description: 'Rose magenta créatif' },
        { name: 'Teal Moderne', value: '#20c997', description: 'Teal moderne et frais' },
        { name: 'Cyan Électrique', value: '#17a2b8', description: 'Cyan électrique dynamique' },
        { name: 'Jaune Soleil', value: '#ffc107', description: 'Jaune soleil optimiste' },
        { name: 'Gris Ardoise', value: '#6c757d', description: 'Gris ardoise professionnel' },
        { name: 'Marron Terre', value: '#795548', description: 'Marron terre naturel' }
    ];

    useEffect(() => {
        // Utiliser la couleur des paramètres école si disponible
        if (schoolSettings.primary_color) {
            setPrimaryColor(schoolSettings.primary_color);
        } else {
            // Sinon, utiliser la couleur sauvegardée localement
            const savedColor = localStorage.getItem('app_primary_color');
            if (savedColor) {
                setPrimaryColor(savedColor);
            }
        }
    }, [schoolSettings.primary_color]);

    useEffect(() => {
        // Appliquer la couleur primaire aux variables CSS
        document.documentElement.style.setProperty('--bs-primary', primaryColor);
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        
        // Générer des variantes de couleur
        const lighterColor = lightenColor(primaryColor, 20);
        const darkerColor = darkenColor(primaryColor, 20);
        const fadeColor = hexToRgba(primaryColor, 0.1);
        
        document.documentElement.style.setProperty('--bs-primary-rgb', hexToRgb(primaryColor));
        document.documentElement.style.setProperty('--primary-light', lighterColor);
        document.documentElement.style.setProperty('--primary-dark', darkerColor);
        document.documentElement.style.setProperty('--primary-fade', fadeColor);
        
        // Sauvegarder localement
        localStorage.setItem('app_primary_color', primaryColor);
    }, [primaryColor]);

    // Fonction pour éclaircir une couleur
    const lightenColor = (color, percent) => {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    // Fonction pour assombrir une couleur
    const darkenColor = (color, percent) => {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    };

    // Convertir hex en RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result 
            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
            : '0, 123, 255'; // Fallback
    };

    // Convertir hex en RGBA
    const hexToRgba = (hex, alpha) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result 
            ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
            : `rgba(0, 123, 255, ${alpha})`; // Fallback
    };

    // Fonction pour changer la couleur primaire
    const changePrimaryColor = (newColor) => {
        setPrimaryColor(newColor);
    };

    // Fonction pour obtenir un style avec la couleur primaire
    const getPrimaryStyle = (property = 'color') => {
        return { [property]: primaryColor };
    };

    // Fonction pour obtenir une classe CSS avec la couleur primaire
    const getPrimaryClass = (baseClass = '') => {
        return `${baseClass} primary-themed`;
    };

    const value = {
        primaryColor,
        colorPresets,
        changePrimaryColor,
        getPrimaryStyle,
        getPrimaryClass,
        lightenColor,
        darkenColor,
        hexToRgb,
        hexToRgba
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};