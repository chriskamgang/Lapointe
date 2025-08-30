import React, { useState, useEffect } from 'react';
import { schoolEquipmentApi } from '../../services/schoolEquipmentApi';
import Card from '../UI/Card';
import Badge from '../UI/Badge';
import Button from '../UI/Button';
import { EquipmentCard } from './EquipmentCard';

/**
 * Widget des équipements requis pour un étudiant
 */
export const StudentEquipmentWidget = ({ 
    student, 
    schoolCode,
    compact = true,
    showTitle = true 
}) => {
    const [equipmentData, setEquipmentData] = useState(null);
    const [uniformData, setUniformData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        const loadEquipment = async () => {
            if (!schoolCode) return;

            try {
                setLoading(true);
                const [equipment, uniform] = await Promise.all([
                    schoolEquipmentApi.getMandatoryEquipment(schoolCode),
                    schoolEquipmentApi.getUniformType(schoolCode)
                ]);

                setEquipmentData(equipment);
                setUniformData(uniform);
            } catch (error) {
                console.error('Erreur chargement équipements étudiant:', error);
            } finally {
                setLoading(false);
            }
        };

        loadEquipment();
    }, [schoolCode]);

    if (loading) {
        return (
            <Card>
                {showTitle && <div className="font-semibold text-gray-900 mb-3">Équipements requis</div>}
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-16 bg-gray-200 rounded"></div>
                </div>
            </Card>
        );
    }

    if (!equipmentData?.success || !uniformData?.success) {
        return null;
    }

    const { equipment_by_type, summary } = equipmentData.data;
    const { uniform_type } = uniformData.data;

    // Calculer le coût total des équipements obligatoires
    const totalCost = Object.values(equipment_by_type).flat().reduce((total, item) => {
        return total + parseFloat(item.price || 0);
    }, 0);

    // Équipements à afficher (limités si compact)
    const equipmentToShow = showAll ? equipment_by_type : 
        Object.fromEntries(
            Object.entries(equipment_by_type).slice(0, 2)
        );

    const totalEquipment = Object.values(equipment_by_type).flat().length;
    const hiddenCount = totalEquipment - Object.values(equipmentToShow).flat().length;

    const getUniformIcon = (type) => {
        return type === 'blouse' ? '🧥' : '👔';
    };

    const getUniformText = (type) => {
        return type === 'blouse' ? 'Blouse médicale' : 'Polo école';
    };

    const getUniformColor = (type) => {
        return type === 'blouse' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
    };

    return (
        <Card>
            {showTitle && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                        Équipements requis
                    </h3>
                    <div className="flex gap-2">
                        <Badge variant="secondary" size="sm">
                            {totalEquipment} équipement{totalEquipment > 1 ? 's' : ''}
                        </Badge>
                        {totalCost > 0 && (
                            <Badge variant="outline" size="sm">
                                {new Intl.NumberFormat('fr-FR').format(totalCost)} FCFA
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* Type d'uniforme */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-lg">{getUniformIcon(uniform_type)}</span>
                        <span className="font-medium text-sm">Uniforme requis:</span>
                    </div>
                    <Badge className={getUniformColor(uniform_type)} size="sm">
                        {getUniformText(uniform_type)}
                    </Badge>
                </div>
            </div>

            {/* Liste des équipements */}
            <div className="space-y-3">
                {Object.keys(equipmentToShow).map(type => (
                    <div key={type}>
                        <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-medium text-gray-700 capitalize">
                                {type === 'clothing' ? 'Vêtements' : 
                                 type === 'medical' ? 'Médical' :
                                 type === 'technical' ? 'Technique' :
                                 type === 'security' ? 'Sécurité' : 
                                 type === 'academic' ? 'Académique' : type}
                            </h4>
                            <Badge variant="secondary" size="sm">
                                {equipmentToShow[type].length}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {equipmentToShow[type].slice(0, compact ? 2 : 999).map(equipment => (
                                <EquipmentCard
                                    key={equipment.id}
                                    equipment={equipment}
                                    compact={true}
                                    showPrice={!compact}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bouton voir plus/moins */}
            {(hiddenCount > 0 || showAll) && (
                <div className="mt-4 text-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? (
                            <>Voir moins</>
                        ) : (
                            <>Voir {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} équipement{hiddenCount > 1 ? 's' : ''}</>
                        )}
                    </Button>
                </div>
            )}

            {/* Résumé financier compact */}
            {totalCost > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-800">
                            Coût total des équipements obligatoires:
                        </span>
                        <span className="font-semibold text-blue-900">
                            {new Intl.NumberFormat('fr-FR').format(totalCost)} FCFA
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
};