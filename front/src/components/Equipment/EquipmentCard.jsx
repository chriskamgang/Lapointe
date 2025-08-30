import React from 'react';
import Badge from '../UI/Badge';

/**
 * Carte d'affichage pour un équipement individuel
 */
const EquipmentCard = ({ equipment, showPrice = true, compact = false }) => {
    const getTypeIcon = (type) => {
        switch (type) {
            case 'clothing':
                return '👕';
            case 'medical':
                return '🏥';
            case 'technical':
                return '💻';
            case 'security':
                return '🦺';
            case 'academic':
                return '📚';
            default:
                return '📦';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'clothing':
                return 'bg-blue-100 text-blue-800';
            case 'medical':
                return 'bg-green-100 text-green-800';
            case 'technical':
                return 'bg-purple-100 text-purple-800';
            case 'security':
                return 'bg-orange-100 text-orange-800';
            case 'academic':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    };

    if (compact) {
        return (
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center space-x-3">
                    <span className="text-lg">{getTypeIcon(equipment.equipment_type)}</span>
                    <div>
                        <div className="font-medium text-sm">{equipment.item_name}</div>
                        {equipment.is_mandatory && (
                            <Badge variant="danger" size="sm">Obligatoire</Badge>
                        )}
                    </div>
                </div>
                {showPrice && (
                    <div className="text-sm font-semibold text-gray-900">
                        {formatPrice(equipment.price)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getTypeIcon(equipment.equipment_type)}</span>
                    <Badge className={getTypeColor(equipment.equipment_type)}>
                        {equipment.equipment_type}
                    </Badge>
                </div>
                {equipment.is_mandatory && (
                    <Badge variant="danger">Obligatoire</Badge>
                )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                {equipment.item_name}
            </h3>

            {equipment.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {equipment.description}
                </p>
            )}

            <div className="space-y-2">
                {showPrice && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Prix:</span>
                        <span className="font-semibold text-lg text-gray-900">
                            {formatPrice(equipment.price)}
                        </span>
                    </div>
                )}

                {equipment.applicable_levels && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-gray-500">Niveaux:</span>
                        {equipment.applicable_levels.slice(0, 3).map((level, index) => (
                            <Badge key={index} variant="secondary" size="sm">
                                {level}
                            </Badge>
                        ))}
                        {equipment.applicable_levels.length > 3 && (
                            <Badge variant="secondary" size="sm">
                                +{equipment.applicable_levels.length - 3}
                            </Badge>
                        )}
                    </div>
                )}

                {equipment.applicable_specialties && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-xs text-gray-500">Spécialités:</span>
                        {equipment.applicable_specialties.slice(0, 2).map((specialty, index) => (
                            <Badge key={index} variant="outline" size="sm">
                                {specialty}
                            </Badge>
                        ))}
                        {equipment.applicable_specialties.length > 2 && (
                            <Badge variant="outline" size="sm">
                                +{equipment.applicable_specialties.length - 2}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EquipmentCard;