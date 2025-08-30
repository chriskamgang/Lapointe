import React, { useState } from 'react';
import EquipmentCard from './EquipmentCard';
import Badge from '../UI/Badge';
import Button from '../UI/Button';
import Card from '../UI/Card';

/**
 * Liste des équipements avec filtres et regroupement
 */
const EquipmentList = ({ 
    equipmentData, 
    loading = false, 
    showFilters = true,
    showPricing = true,
    compact = false,
    title
}) => {
    const [selectedType, setSelectedType] = useState('all');
    const [showMandatoryOnly, setShowMandatoryOnly] = useState(false);

    // Debug logs
    console.log('🎯 EQUIPMENTLIST - Received equipmentData:', equipmentData);
    console.log('🎯 EQUIPMENTLIST - Loading:', loading);
    console.log('🎯 EQUIPMENTLIST - success check:', equipmentData?.success);
    console.log('🎯 EQUIPMENTLIST - data check:', equipmentData?.data);
    console.log('🎯 EQUIPMENTLIST - equipment_by_type check:', equipmentData?.data?.equipment_by_type);

    if (loading) {
        return (
            <Card>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    // La structure des données peut être soit directe, soit wrappée dans success/data
    const actualData = equipmentData?.data || equipmentData;
    
    if (!actualData?.equipment_by_type) {
        return (
            <Card>
                <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📦</div>
                    <p>Aucun équipement trouvé</p>
                </div>
            </Card>
        );
    }

    const { equipment_by_type, school, summary } = actualData;
    const equipmentTypes = Object.keys(equipment_by_type);

    // Filtrer les équipements
    const getFilteredEquipment = () => {
        let filtered = {};

        if (selectedType === 'all') {
            filtered = equipment_by_type;
        } else {
            filtered = { [selectedType]: equipment_by_type[selectedType] || [] };
        }

        if (showMandatoryOnly) {
            Object.keys(filtered).forEach(type => {
                filtered[type] = filtered[type].filter(item => item.is_mandatory);
            });
        }

        return filtered;
    };

    const filteredEquipment = getFilteredEquipment();
    const totalFiltered = Object.values(filteredEquipment).flat().length;

    const getTypeLabel = (type) => {
        const labels = {
            'clothing': 'Vêtements',
            'medical': 'Équipement médical',
            'technical': 'Équipement technique',
            'security': 'Équipement de sécurité',
            'academic': 'Fournitures académiques'
        };
        return labels[type] || type;
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'clothing':
                return 'text-blue-600';
            case 'medical':
                return 'text-green-600';
            case 'technical':
                return 'text-purple-600';
            case 'security':
                return 'text-orange-600';
            case 'academic':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };

    const calculateTotalPrice = (equipment) => {
        return Object.values(equipment).flat().reduce((total, item) => {
            return total + parseFloat(item.price || 0);
        }, 0);
    };

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    {title && <h2 className="text-xl font-semibold text-gray-900 mb-1">{title}</h2>}
                    {school && (
                        <p className="text-gray-600">
                            École: <span className="font-medium">{school.name}</span> ({school.code})
                        </p>
                    )}
                </div>
                
                {summary && (
                    <div className="flex gap-2">
                        <Badge variant="secondary">
                            {summary.total_items} équipement{summary.total_items > 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="danger">
                            {summary.mandatory_items} obligatoire{summary.mandatory_items > 1 ? 's' : ''}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Filtres */}
            {showFilters && equipmentTypes.length > 1 && (
                <Card>
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-sm font-medium text-gray-700">Filtrer par type:</span>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={selectedType === 'all' ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedType('all')}
                            >
                                Tout voir ({Object.values(equipment_by_type).flat().length})
                            </Button>
                            {equipmentTypes.map(type => (
                                <Button
                                    key={type}
                                    variant={selectedType === type ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedType(type)}
                                >
                                    {getTypeLabel(type)} ({equipment_by_type[type].length})
                                </Button>
                            ))}
                        </div>
                        
                        <div className="ml-auto">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={showMandatoryOnly}
                                    onChange={(e) => setShowMandatoryOnly(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Obligatoires seulement</span>
                            </label>
                        </div>
                    </div>
                </Card>
            )}

            {/* Pricing summary */}
            {showPricing && totalFiltered > 0 && (
                <Card className="bg-gray-50">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                            Coût total ({totalFiltered} équipement{totalFiltered > 1 ? 's' : ''}):
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                            {new Intl.NumberFormat('fr-FR').format(calculateTotalPrice(filteredEquipment))} FCFA
                        </span>
                    </div>
                </Card>
            )}

            {/* Liste des équipements */}
            {Object.keys(filteredEquipment).length === 0 ? (
                <Card>
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">🔍</div>
                        <p>Aucun équipement ne correspond aux filtres sélectionnés</p>
                    </div>
                </Card>
            ) : (
                Object.keys(filteredEquipment).map(type => (
                    <div key={type} className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <h3 className={`text-lg font-medium ${getTypeColor(type)}`}>
                                {getTypeLabel(type)}
                            </h3>
                            <Badge variant="secondary" size="sm">
                                {filteredEquipment[type].length}
                            </Badge>
                        </div>
                        
                        <div className={`grid gap-4 ${
                            compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        }`}>
                            {filteredEquipment[type].map(equipment => (
                                <EquipmentCard
                                    key={equipment.id}
                                    equipment={equipment}
                                    showPrice={showPricing}
                                    compact={compact}
                                />
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default EquipmentList;